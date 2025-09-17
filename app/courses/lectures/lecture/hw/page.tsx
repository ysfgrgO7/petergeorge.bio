import { Suspense } from "react";
import HwClient from "./hwClient";

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={<div>Loading quiz...</div>}>
      <HwClient />
    </Suspense>
  );
}
