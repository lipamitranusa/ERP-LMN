import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { api } from "./lib/api";
import { LembagaProvider } from "./contexts/LembagaContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 menit — data fresh dianggap valid
      gcTime: 10 * 60 * 1000,     // 10 menit — cached di memory sebelum GC
      retry: 1,                      // retry sekali jika gagal
      refetchOnWindowFocus: true,   // aktifkan lagi — refresh saat tab di-focus
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,                     // mutation tidak perlu retry otomatis
    },
  },
});

// Hapus prefetch dashboard di sini — prefetch sebelum login menyebabkan error cache
// yang bikin dashboard tidak pernah bisa fetch ulang. Dashboard handle fetch sendiri.

ReactDOM.render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <LembagaProvider>
        <App />
      </LembagaProvider>
    </BrowserRouter>
  </QueryClientProvider>,
  document.getElementById("root")
);
