import { IllustrationBase } from "./IllustrationBase";
import { ILLUSTRATION_PATHS } from "@/lib/brand";

export function ConversationIllustration(props: Partial<React.ComponentProps<typeof IllustrationBase>>) {
  return (
    <IllustrationBase
      src={ILLUSTRATION_PATHS.conversation}
      width={280}
      height={220}
      {...props}
    />
  );
}
