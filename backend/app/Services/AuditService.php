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
        $resolvedLembagaId = $lembagaId
            ?? $after?->lembaga_id
            ?? $before?->lembaga_id
            // Lembaga is root entity: its own id IS the lembaga_id
            ?? ($after instanceof \App\Models\Lembaga ? $after->id : null)
            ?? ($before instanceof \App\Models\Lembaga ? $before->id : null);

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
        $resolvedLembagaId = $lembagaId ?? session('lembaga_id');

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