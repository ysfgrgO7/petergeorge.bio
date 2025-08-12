"use client";

import { Suspense } from "react";
import LecturesContent from "./lecturesPage";

export default function LecturesPage() {
  return (
    <Suspense fallback={<div>Loading lectures...</div>}>
      <LecturesContent />
    </Suspense>
  );
}