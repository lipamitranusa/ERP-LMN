<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuActionController extends Controller
{
    public function index(): JsonResponse
    {
        $items = MenuAction::orderBy('modul')->orderBy('action')->get();
        return response()->json(['data' => $items]);
    }
}