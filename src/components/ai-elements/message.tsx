import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, HTMLAttributes } from "react";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full items-end gap-2 py-4",
      from === "user" ? "is-user justify-end" : "is-assistant flex-row-reverse justify-start",
      className
    )}
    {...props}
  />
);

const messageContentVariants = cva(
  "flex flex-col gap-2 overflow-hidden text-sm",
  {
    variants: {
      variant: {
        contained: [
          "max-w-[80%] px-4 py-3",
          "group-[.is-user]:bg-[hsl(var(--chat-user-bg))] group-[.is-user]:text-[hsl(var(--chat-user-text))]",
          "group-[.is-assistant]:bg-[hsl(var(--chat-assistant-bg))] group-[.is-assistant]:text-[hsl(var(--chat-assistant-text))] group-[.is-assistant]:border group-[.is-assistant]:border-[hsl(var(--chat-assistant-border))]",
        ],
        flat: [
          "group-[.is-user]:max-w-[80%]",
          "group-[.is-assistant]:text-foreground",
        ],
      },
    },
    defaultVariants: {
      variant: "contained",
    },
  }
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof messageContentVariants>;

export const MessageContent = ({
  children,
  className,
  variant,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(messageContentVariants({ variant, className }))}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn("size-8 ring-1 ring-border/40 shadow-sm", className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback className="text-muted-foreground">{name?.slice(0, 2) || "ME"}</AvatarFallback>
  </Avatar>
);
