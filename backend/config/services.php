<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Business Cloud API (Meta)
    |--------------------------------------------------------------------------
    |
    | Dibaca lewat config(), bukan env() langsung di kode aplikasi — setelah
    | `config:cache` dipanggil, env() selalu bernilai null.
    |
    */

    'whatsapp' => [
        'api_url' => env('WHATSAPP_API_URL'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'business_account_id' => env('WHATSAPP_BUSINESS_ACCOUNT_ID'),
        'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        'webhook_verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Gateway
    |--------------------------------------------------------------------------
    |
    | Nilai dari tabel `payment_settings` selalu menang; config ini hanya
    | fallback saat tabel belum diisi.
    |
    */

    'payment_gateway' => [
        'driver' => env('PAYMENT_GATEWAY_DRIVER', 'fake'),
        'mode' => env('PAYMENT_GATEWAY_MODE', env('PAYMENT_GATEWAY_ENV', 'sandbox')),
        'server_key' => env('MIDTRANS_SERVER_KEY', env('PAYMENT_GATEWAY_SERVER_KEY', '')),
        'client_key' => env('PAYMENT_GATEWAY_CLIENT_KEY', ''),
        'merchant_id' => env('PAYMENT_GATEWAY_MERCHANT_ID', ''),
        'webhook_secret' => env('PAYMENT_GATEWAY_WEBHOOK_SECRET', ''),
    ],

];
