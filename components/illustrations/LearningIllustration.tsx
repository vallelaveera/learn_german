import { IllustrationBase } from "./IllustrationBase";
import { ILLUSTRATION_PATHS } from "@/lib/brand";

export function LearningIllustration(props: Partial<React.ComponentProps<typeof IllustrationBase>>) {
  return (
    <IllustrationBase
      src={ILLUSTRATION_PATHS.learning}
      width={260}
      height={200}
      {...props}
    />
  );
}
