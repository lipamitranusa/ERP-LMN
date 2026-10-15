<?php

namespace App\Services\Payment;

use App\Models\PaymentSetting;

class PaymentGatewayManager
{
    public function driver(?string $name = null): PaymentGatewayInterface
    {
        $name = $name ?? $this->resolveDriver();

        return match (strtolower($name)) {
            'midtrans' => new MidtransDriver(),
            'xendit' => new XenditDriver(),
            'fake', 'null', '' => new FakeGateway(),
            default => throw new \InvalidArgumentException("Unknown payment gateway driver: {$name}"),
        };
    }

    private function resolveDriver(): string
    {
        try {
            if (! PaymentSetting::isGatewayEnabled()) {
                return 'fake';
            }
            return PaymentSetting::value('driver') ?? env('PAYMENT_GATEWAY_DRIVER', 'fake');
        } catch (\Throwable) {
            return env('PAYMENT_GATEWAY_DRIVER', 'fake');
        }
    }

    public function currentDriverName(): string
    {
        return $this->driver()->name();
    }
}
