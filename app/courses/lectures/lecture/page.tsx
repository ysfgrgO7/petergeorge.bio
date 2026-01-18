import React, { Suspense } from "react";
import LecturePage from "./LecturePage"; // ✅ no curly braces
import Loading from "@/app/components/Loading";

export default function Page() {
  return (
    <Suspense fallback={<Loading text="Loading lecture..." />}>
      <LecturePage />
    </Suspense>
  );
}
