<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pesan Validasi — Bahasa Indonesia
    |--------------------------------------------------------------------------
    |
    | Dipakai sebagai fallback untuk validasi di seluruh API. Tanpa file ini,
    | Laravel menampilkan kunci mentah ("validation.required") yang tidak
    | dimengerti pengguna akhir.
    |
    */

    'accepted' => 'Kolom :attribute harus disetujui.',
    'accepted_if' => 'Kolom :attribute harus disetujui ketika :other bernilai :value.',
    'active_url' => 'Kolom :attribute harus berupa URL yang valid.',
    'after' => 'Kolom :attribute harus berisi tanggal setelah :date.',
    'after_or_equal' => 'Kolom :attribute harus berisi tanggal setelah atau sama dengan :date.',
    'alpha' => 'Kolom :attribute hanya boleh berisi huruf.',
    'alpha_dash' => 'Kolom :attribute hanya boleh berisi huruf, angka, tanda hubung, dan garis bawah.',
    'alpha_num' => 'Kolom :attribute hanya boleh berisi huruf dan angka.',
    'any_of' => 'Kolom :attribute tidak valid.',
    'array' => 'Kolom :attribute harus berupa larik.',
    'array_keys' => 'Kolom :attribute hanya boleh berisi kunci berikut: :values.',
    'ascii' => 'Kolom :attribute hanya boleh berisi karakter dan simbol satu byte.',
    'base64' => 'Kolom :attribute harus berupa string Base64 yang valid.',
    'before' => 'Kolom :attribute harus berisi tanggal sebelum :date.',
    'before_or_equal' => 'Kolom :attribute harus berisi tanggal sebelum atau sama dengan :date.',
    'between' => [
        'array' => 'Kolom :attribute harus berisi antara :min sampai :max item.',
        'file' => 'Ukuran :attribute harus antara :min sampai :max kilobyte.',
        'numeric' => 'Kolom :attribute harus bernilai antara :min sampai :max.',
        'string' => 'Kolom :attribute harus berisi antara :min sampai :max karakter.',
    ],
    'boolean' => 'Kolom :attribute harus bernilai benar atau salah.',
    'can' => 'Kolom :attribute berisi nilai yang tidak diizinkan.',
    'confirmed' => 'Konfirmasi :attribute tidak cocok.',
    'contains' => 'Kolom :attribute belum memuat nilai yang diperlukan.',
    'current_password' => 'Password salah.',
    'date' => 'Kolom :attribute bukan tanggal yang valid.',
    'date_equals' => 'Kolom :attribute harus berisi tanggal yang sama dengan :date.',
    'date_format' => 'Kolom :attribute harus sesuai format :format.',
    'decimal' => 'Kolom :attribute harus memiliki :decimal angka di belakang koma.',
    'declined' => 'Kolom :attribute harus ditolak.',
    'declined_if' => 'Kolom :attribute harus ditolak ketika :other bernilai :value.',
    'different' => 'Kolom :attribute dan :other harus berbeda.',
    'digits' => 'Kolom :attribute harus terdiri dari :digits angka.',
    'digits_between' => 'Kolom :attribute harus terdiri antara :min sampai :max angka.',
    'dimensions' => 'Kolom :attribute memiliki dimensi gambar yang tidak valid.',
    'distinct' => 'Kolom :attribute memiliki nilai duplikat.',
    'doesnt_contain' => 'Kolom :attribute tidak boleh memuat salah satu dari: :values.',
    'doesnt_end_with' => 'Kolom :attribute tidak boleh diakhiri salah satu dari: :values.',
    'doesnt_start_with' => 'Kolom :attribute tidak boleh diawali salah satu dari: :values.',
    'email' => 'Kolom :attribute harus berupa alamat email yang valid.',
    'encoding' => 'Kolom :attribute harus di-encode dengan :encoding.',
    'ends_with' => 'Kolom :attribute harus diakhiri salah satu dari: :values.',
    'enum' => ':attribute yang dipilih tidak valid.',
    'exists' => ':attribute yang dipilih tidak valid.',
    'extensions' => 'Kolom :attribute harus memiliki salah satu ekstensi berikut: :values.',
    'file' => 'Kolom :attribute harus berupa berkas.',
    'filled' => 'Kolom :attribute wajib diisi.',
    'gt' => [
        'array' => 'Kolom :attribute harus memiliki lebih dari :value item.',
        'file' => 'Ukuran :attribute harus lebih besar dari :value kilobyte.',
        'numeric' => 'Kolom :attribute harus lebih besar dari :value.',
        'string' => 'Kolom :attribute harus lebih dari :value karakter.',
    ],
    'gte' => [
        'array' => 'Kolom :attribute harus memiliki minimal :value item.',
        'file' => 'Ukuran :attribute harus minimal :value kilobyte.',
        'numeric' => 'Kolom :attribute harus minimal :value.',
        'string' => 'Kolom :attribute harus minimal :value karakter.',
    ],
    'hex_color' => 'Kolom :attribute harus berupa warna heksadesimal yang valid.',
    'image' => 'Kolom :attribute harus berupa gambar.',
    'in' => ':attribute yang dipilih tidak valid.',
    'in_array' => 'Kolom :attribute tidak ada dalam :other.',
    'in_array_keys' => 'Kolom :attribute hanya boleh berisi kunci berikut: :values.',
    'integer' => 'Kolom :attribute harus berupa bilangan bulat.',
    'ip' => 'Kolom :attribute harus berupa alamat IP yang valid.',
    'ipv4' => 'Kolom :attribute harus berupa alamat IPv4 yang valid.',
    'ipv6' => 'Kolom :attribute harus berupa alamat IPv6 yang valid.',
    'json' => 'Kolom :attribute harus berupa string JSON yang valid.',
    'list' => 'Kolom :attribute harus berupa larik.',
    'lowercase' => 'Kolom :attribute harus berupa huruf kecil.',
    'lt' => [
        'array' => 'Kolom :attribute harus memiliki kurang dari :value item.',
        'file' => 'Ukuran :attribute harus kurang dari :value kilobyte.',
        'numeric' => 'Kolom :attribute harus kurang dari :value.',
        'string' => 'Kolom :attribute harus kurang dari :value karakter.',
    ],
    'lte' => [
        'array' => 'Kolom :attribute tidak boleh memiliki lebih dari :value item.',
        'file' => 'Ukuran :attribute tidak boleh lebih dari :value kilobyte.',
        'numeric' => 'Kolom :attribute tidak boleh lebih dari :value.',
        'string' => 'Kolom :attribute tidak boleh lebih dari :value karakter.',
    ],
    'mac_address' => 'Kolom :attribute harus berupa alamat MAC yang valid.',
    'max' => [
        'array' => 'Kolom :attribute tidak boleh memiliki lebih dari :max item.',
        'file' => 'Ukuran :attribute tidak boleh lebih dari :max kilobyte.',
        'numeric' => 'Kolom :attribute tidak boleh lebih dari :max.',
        'string' => 'Kolom :attribute tidak boleh lebih dari :max karakter.',
    ],
    'max_digits' => 'Kolom :attribute tidak boleh memiliki lebih dari :max angka.',
    'mimes' => 'Kolom :attribute harus berupa berkas berjenis: :values.',
    'mimetypes' => 'Kolom :attribute harus berupa berkas berjenis MIME: :values.',
    'min' => [
        'array' => 'Kolom :attribute harus memiliki minimal :min item.',
        'file' => 'Ukuran :attribute harus minimal :min kilobyte.',
        'numeric' => 'Kolom :attribute harus minimal :min.',
        'string' => 'Kolom :attribute harus minimal :min karakter.',
    ],
    'min_digits' => 'Kolom :attribute harus memiliki minimal :min angka.',
    'missing' => 'Kolom :attribute tidak ada.',
    'missing_if' => 'Kolom :attribute tidak ada ketika :other bernilai :value.',
    'missing_unless' => 'Kolom :attribute tidak ada kecuali :other bernilai :value.',
    'missing_with' => 'Kolom :attribute tidak ada jika :values ada.',
    'missing_with_all' => 'Kolom :attribute tidak ada jika :values ada.',
    'multiple_of' => 'Kolom :attribute harus merupakan kelipatan dari :value.',
    'not_in' => ':attribute yang dipilih tidak valid.',
    'not_regex' => 'Format :attribute tidak valid.',
    'numeric' => 'Kolom :attribute harus berupa angka.',
    'password' => 'Password minimal :min karakter.',
    'present' => 'Kolom :attribute wajib ada.',
    'present_if' => 'Kolom :attribute wajib ada ketika :other bernilai :value.',
    'present_unless' => 'Kolom :attribute wajib ada kecuali :other bernilai :value.',
    'present_with' => 'Kolom :attribute wajib ada jika :values ada.',
    'present_with_all' => 'Kolom :attribute wajib ada jika :values ada.',
    'prohibited' => 'Kolom :attribute dilarang diisi.',
    'prohibited_if' => 'Kolom :attribute dilarang diisi ketika :other bernilai :value.',
    'prohibited_if_accepted' => 'Kolom :attribute dilarang diisi ketika :other disetujui.',
    'prohibited_if_declined' => 'Kolom :attribute dilarang diisi ketika :other ditolak.',
    'prohibited_unless' => 'Kolom :attribute dilarang diisi kecuali :other bernilai :value.',
    'prohibits' => 'Kolom :attribute melarang :other diisi.',
    'regex' => 'Format :attribute tidak valid.',
    'required' => 'Kolom :attribute wajib diisi.',
    'required_array_keys' => 'Kolom :attribute harus memuat entri untuk: :values.',
    'required_if' => 'Kolom :attribute wajib diisi ketika :other bernilai :value.',
    'required_if_accepted' => 'Kolom :attribute wajib diisi ketika :other disetujui.',
    'required_if_declined' => 'Kolom :attribute wajib diisi ketika :other ditolak.',
    'required_unless' => 'Kolom :attribute wajib diisi kecuali :other bernilai :value.',
    'required_with' => 'Kolom :attribute wajib diisi jika :values ada.',
    'required_with_all' => 'Kolom :attribute wajib diisi jika :values ada.',
    'required_without' => 'Kolom :attribute wajib diisi jika :values tidak ada.',
    'required_without_all' => 'Kolom :attribute wajib diisi jika :values tidak ada.',
    'same' => 'Kolom :attribute harus sama dengan :other.',
    'size' => [
        'array' => 'Kolom :attribute harus berisi :size item.',
        'file' => 'Ukuran :attribute harus :size kilobyte.',
        'numeric' => 'Kolom :attribute harus bernilai :size.',
        'string' => 'Kolom :attribute harus berisi :size karakter.',
    ],
    'starts_with' => 'Kolom :attribute harus diawali salah satu dari: :values.',
    'string' => 'Kolom :attribute harus berupa teks.',
    'timezone' => 'Kolom :attribute harus berupa zona waktu yang valid.',
    'unique' => ':attribute sudah digunakan.',
    'uploaded' => 'Kolom :attribute gagal diunggah.',
    'uppercase' => 'Kolom :attribute harus berupa huruf besar.',
    'url' => 'Kolom :attribute harus berupa URL yang valid.',
    'ulid' => 'Kolom :attribute harus berupa ULID yang valid.',
    'uuid' => 'Kolom :attribute harus berupa UUID yang valid.',

    /*
    |--------------------------------------------------------------------------
    | Pesan Kustom
    |--------------------------------------------------------------------------
    */

    'custom' => [
        'attribute-name' => [
            'rule-name' => 'custom-message',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Nama Atribut
    |--------------------------------------------------------------------------
    |
    | Dipakai untuk mengganti nama field teknis (snake_case) menjadi label
    | berbahasa Indonesia yang dimengerti pengguna.
    |
    */

    'attributes' => [
        'nominal' => 'nominal',
        'nomor_referensi' => 'nomor referensi transfer',
        'dari_rekening' => 'rekening pengirim',
        'bukti' => 'file bukti',
        'alasan_penolakan' => 'alasan penolakan',
        'total_tagihan' => 'total tagihan',
        'nomor_invoice' => 'nomor invoice',
        'due_date' => 'tanggal jatuh tempo',
        'tanggal' => 'tanggal',
        'email' => 'email',
        'password' => 'password',
        'password_confirmation' => 'konfirmasi password',
        'nama' => 'nama',
        'nama_pt' => 'nama perusahaan',
        'npwp' => 'NPWP',
        'telepon' => 'nomor telepon',
        'alamat' => 'alamat',
        'kota' => 'kota',
        'kode' => 'kode akun',
        'jenis' => 'jenis',
        'kelompok' => 'kelompok',
        'tipe_faskes' => 'tipe faskes',
        'lembaga_id' => 'lembaga',
        'siklus_id' => 'siklus akreditasi',
        'invoice_id' => 'invoice',
        'pks_id' => 'PKS',
        'tenaga_ahli_id' => 'tenaga ahli',
        'faskes_id' => 'faskes',
        'role_id' => 'peran',
        'menurut' => 'urutan',
        'q' => 'kata kunci pencarian',
    ],

];