<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Frontend SPA React dilayani dari route web. File index.html hasil build
 * disalin ke backend/public/ saat deploy, jadi test ini membuat file
 * sementara lalu mengembalikannya seperti semula.
 */
class SpaFallbackTest extends TestCase
{
    private string $indexPath;

    private ?string $backup = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->indexPath = public_path('index.html');
        $this->backup = is_file($this->indexPath)
            ? (string) file_get_contents($this->indexPath)
            : null;

        file_put_contents($this->indexPath, '<!doctype html><html><body><div id="root">spa</div></body></html>');
    }

    protected function tearDown(): void
    {
        if ($this->backup === null) {
            @unlink($this->indexPath);
        } else {
            file_put_contents($this->indexPath, $this->backup);
        }

        parent::tearDown();
    }

    public function test_root_path_serves_the_spa_index(): void
    {
        $this->get('/')->assertStatus(200);
    }

    public function test_deep_link_falls_back_to_the_spa_index(): void
    {
        $this->get('/kontrak/abc-123')->assertStatus(200);
    }

    public function test_unknown_api_route_returns_json_404_instead_of_html(): void
    {
        $this->getJson('/api/route-yang-tidak-ada')
            ->assertStatus(404)
            ->assertJson(['message' => 'Not Found']);
    }
}
