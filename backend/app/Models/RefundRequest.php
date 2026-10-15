<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefundRequest extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'refund_requests';

    protected $fillable = [
        'id',
        'invoice_id',
        'requested_by',
        'approved_by',
        'alasan',
        'nominal',
        'status',
        'tanggal_approved',
        'catatan_approval',
        'ledger_entry_id',
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
        'tanggal_approved' => 'datetime',
    ];

    public const STATUS_REQUESTED = 'requested';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_EXECUTED = 'executed';

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'approved_by');
    }

    public function ledgerEntry(): BelongsTo
    {
        return $this->belongsTo(LedgerEntry::class, 'ledger_entry_id');
    }
}
