"use client";

import { useEffect, useState } from "react";
import axiosClient from "@/lib/axios-client";

export default function TestApiPage() {
  const [message, setMessage] = useState("Đang kiểm tra API...");
  const [errorDetail, setErrorDetail] = useState("");

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    axiosClient
      .get("/health")
      .then((res) => {
        setMessage(res.message || "Kết nối backend thành công");
        setErrorDetail("");
      })
      .catch((error) => {
        setMessage("Không kết nối được backend");
        setErrorDetail(`Status: ${error.status || "N/A"} | Message: ${error.message}`);
        console.error("API ERROR:", error);
      });
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Test API</h1>

      <p className="mt-4">
        <b>API Base URL:</b> {apiBaseUrl || "Chưa đọc được .env.local"}
      </p>

      <p className="mt-4">
        <b>Kết quả:</b> {message}
      </p>

      {errorDetail && (
        <p className="mt-4 text-red-500">
          <b>Chi tiết lỗi:</b> {errorDetail}
        </p>
      )}
    </main>
  );
}