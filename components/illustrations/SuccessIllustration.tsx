import { IllustrationBase } from "./IllustrationBase";
import { ILLUSTRATION_PATHS } from "@/lib/brand";

export function SuccessIllustration(props: Partial<React.ComponentProps<typeof IllustrationBase>>) {
  return (
    <IllustrationBase
      src={ILLUSTRATION_PATHS.success}
      width={200}
      height={200}
      {...props}
    />
  );
}
