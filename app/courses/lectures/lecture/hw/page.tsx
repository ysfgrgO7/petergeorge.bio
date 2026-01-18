import { Suspense } from "react";
import HwClient from "./hwClient";
import Loading from "@/app/components/Loading";

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={<Loading text="Loading homework..." />}>
      <HwClient />
    </Suspense>
  );
}
