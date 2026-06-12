import { IllustrationBase } from "./IllustrationBase";
import { ILLUSTRATION_PATHS } from "@/lib/brand";

export function ProgressIllustration(props: Partial<React.ComponentProps<typeof IllustrationBase>>) {
  return (
    <IllustrationBase
      src={ILLUSTRATION_PATHS.progress}
      width={240}
      height={190}
      {...props}
    />
  );
}
