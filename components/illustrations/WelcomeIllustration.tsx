import { IllustrationBase } from "./IllustrationBase";
import { ILLUSTRATION_PATHS } from "@/lib/brand";

export function WelcomeIllustration(props: Partial<React.ComponentProps<typeof IllustrationBase>>) {
  return (
    <IllustrationBase
      src={ILLUSTRATION_PATHS.welcome}
      width={300}
      height={240}
      {...props}
    />
  );
}
