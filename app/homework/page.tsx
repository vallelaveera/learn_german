"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeworkPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/words?view=homework");
  }, [router]);
  return null;
}
