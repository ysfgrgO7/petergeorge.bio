"use client";

import { Suspense } from "react";
import LecturesContent from "./lecturesPage";
import Loading from "@/app/components/Loading";

export default function LecturesPage() {
  return (
    <Suspense fallback={<Loading text="Loading lectures..." />}>
      <LecturesContent />
    </Suspense>
  );
}
