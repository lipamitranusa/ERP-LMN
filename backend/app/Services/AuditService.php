<?php

namespace App\Services;

use App\Models\AuditTrail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Service untuk mencatat perubahan ke audit_trail (NFR-2, FR-6.5).
 * Append-only: TIDAK boleh ada update/delete dari service lain.
 */
class AuditService
{
    public function __construct(private ?Request $request = null)
    {
    }

    public function record(
        string $action,
        ?Model $before = null,
        ?Model $after = null,
        ?string $targetType = null,
        ?string $targetId = null,
        ?string $lembagaId = null,
    ): AuditTrail {
        $aktorId = $this->request?->user()?->id;
        $resolvedLembagaId = $this->resolveLembagaId($lembagaId, $after, $before);

        return AuditTrail::create([
            'id' => (string) Str::uuid(),
            'aktor_id' => $aktorId,
            'aksi' => $action,
            'target_type' => $targetType ?? $after?->getMorphClass() ?? $before?->getMorphClass(),
            'target_id' => $targetId ?? $after?->getKey() ?? $before?->getKey(),
            'data_sebelum' => $this->normalize($before),
            'data_sesudah' => $this->normalize($after),
            'ip_address' => $this->request?->ip(),
            'user_agent' => $this->request?->userAgent(),
            'lembaga_id' => $resolvedLembagaId,
        ]);
    }

    /**
     * Convenience helper for action-only audit entries (no before/after model diff).
     * Useful for events like "invoice.paid" where the state change is the action itself.
     */
    public function log(string $action, string $targetType, string $targetId, array $extra = [], ?string $lembagaId = null): AuditTrail
    {
        $aktorId = $this->request?->user()?->id;
        $resolvedLembagaId = $lembagaId
            ?? $this->deriveFromTarget($targetType, $targetId)
            ?? session('lembaga_id')
            ?? app(LembagaResolver::class)->fromAkunPengguna($aktorId)
            ?? app(LembagaResolver::class)->fallback();

        return AuditTrail::create([
            'id' => (string) Str::uuid(),
            'aktor_id' => $aktorId,
            'aksi' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'data_sebelum' => $extra ?: null,
            'data_sesudah' => null,
            'ip_address' => $this->request?->ip(),
            'user_agent' => $this->request?->userAgent(),
            'lembaga_id' => $resolvedLembagaId,
        ]);
    }

    /**
     * `audit_trail.lembaga_id` bertipe NOT NULL, sementara `session('lembaga_id')`
     * hanya ada pada request HTTP. Di console/scheduler/test nilainya null —
     * karena itu lemma diturunkan dari objek target (invoice → siklus, dsb.)
     * sebelum jatuh ke session.
     */
    private function resolveLembagaId(?string $explicit, ?Model $after, ?Model $before): ?string
    {
        if ($explicit) {
            return $explicit;
        }

        foreach ([$after, $before] as $model) {
            if (! $model) {
                continue;
            }

            // Lembaga is root entity: its own id IS the lembaga_id
            if ($model instanceof \App\Models\Lembaga) {
                return $model->id;
            }

            $fromModel = $model->lembaga_id;
            if ($fromModel) {
                return $fromModel;
            }

            $derived = $this->deriveFromModel($model);
            if ($derived) {
                return $derived;
            }
        }

        return session('lembaga_id')
            ?? app(LembagaResolver::class)->fromAkunPengguna($this->request?->user()?->id)
            ?? app(LembagaResolver::class)->fallback();
    }

    private function deriveFromModel(Model $model): ?string
    {
        $resolver = app(LembagaResolver::class);
        $id = $model->getKey();

        return match ($model::class) {
            \App\Models\Invoice::class => $resolver->fromInvoice($id),
            \App\Models\PembayaranHonor::class => $resolver->fromPembayaranHonor($id),
            \App\Models\HutangPajak::class => $resolver->fromHutangPajak($id),
            \App\Models\JurnalUmum::class => $resolver->fromJurnal($id),
            default => null,
        };
    }

    private function deriveFromTarget(string $targetType, string $targetId): ?string
    {
        $resolver = app(LembagaResolver::class);
        $short = str_contains($targetType, '\\') ? class_basename($targetType) : $targetType;

        return match ($short) {
            'Invoice' => $resolver->fromInvoice($targetId),
            'PembayaranHonor' => $resolver->fromPembayaranHonor($targetId),
            'HutangPajak' => $resolver->fromHutangPajak($targetId),
            'JurnalUmum' => $resolver->fromJurnal($targetId),
            default => null,
        };
    }
    private function normalize(?Model $model): ?array
    {
        if (! $model) {
            return null;
        }
        $hidden = array_merge($model->getHidden(), ['password_hash', 'password']);
        return collect($model->getAttributes())
            ->reject(fn ($v, $k) => in_array($k, $hidden, true))
            ->all();
    }
}