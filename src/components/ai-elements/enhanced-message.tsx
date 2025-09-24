import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Message, MessageAvatar, MessageContent } from './message';
import { cn } from '@/lib/utils';
import {
  EnhancedChatMessage,
  MessageAction,
  MessageReaction,
  AIElementConfig,
  CodeBlock,
  Source,
} from '../../types/chat-enhanced';
import { useAIElements } from '../../hooks/useAIElements';
import {
  Copy,
  Edit,
  RefreshCw,
  Download,
  Check,
  Clock,
  AlertCircle,
  ThumbsUp,
  Paperclip,
} from 'lucide-react';

interface EnhancedMessageProps {
  message: EnhancedChatMessage;
  config?: AIElementConfig;
  onAction?: (action: MessageAction) => void;
  onReaction?: (emoji: string) => void;
  className?: string;
}

const messageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

const statusIcons: Record<string, React.ComponentType<any>> = {
  sending: Clock,
  sent: Check,
  delivered: Check,
  read: Check,
  error: AlertCircle,
  failed: AlertCircle,
};

const statusColors: Record<string, string> = {
  sending: 'text-amber-500',
  sent: 'text-blue-500',
  delivered: 'text-emerald-500',
  read: 'text-emerald-600',
  error: 'text-red-500',
  failed: 'text-red-600',
};

const defaultReactions = ['👍', '❤️', '😄', '😢'];

const ASSISTANT_AVATAR_SRC =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMTExODI3IiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxZjI5MzciIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjQ4IiByPSI0NiIgZmlsbD0idXJsKCNncmFkKSIgc3Ryb2tlPSIjRkY2QjM1IiBzdHJva2Utd2lkdGg9IjQiIC8+CiAgPHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSdJbnRlcicsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIGZvbnQtd2VpZ2h0PSI2MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIj5BSTwvdGV4dD4KPC9zdmc+';
const USER_AVATAR_SRC =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQyIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI0ZGRURENSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRjk3MzE2IiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDYiIGZpbGw9InVybCgjZ3JhZDIpIiBzdHJva2U9IiNGQjkyM0MiIHN0cm9rZS13aWR0aD0iNCIgLz4KICA8dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9J0ludGVyJywgIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIGZvbnQtd2VpZ2h0PSI2MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM3QzJEMTIiPllPVTwvdGV4dD4KPC9zdmc+';

export function EnhancedMessage({
  message,
  config,
  onAction,
  onReaction,
  className = '',
}: EnhancedMessageProps) {
  const [showReactions, setShowReactions] = useState(false);
  const { executeAction } = useAIElements();

  const handleAction = useCallback(
    (action: MessageAction) => {
      if (onAction) {
        onAction(action);
      } else {
        executeAction(action);
      }
    },
    [onAction, executeAction],
  );

  const handleReaction = useCallback(
    (emoji: string) => {
      if (onReaction) {
        onReaction(emoji);
      }
      setShowReactions(false);
    },
    [onReaction],
  );

  const formatTimestamp = (timestamp: Date) =>
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(timestamp);

  const StatusIcon = statusIcons[message.status || 'sent'];
  const statusColor = statusColors[message.status || 'sent'];
  const isUser = message.role === 'user';

  const defaultActions: MessageAction[] = [
    {
      id: 'copy',
      type: 'copy',
      label: 'Copy',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(message.content),
    },
    {
      id: 'edit',
      type: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: () => console.log('Edit message:', message.id),
      disabled: message.role !== 'user',
    },
    {
      id: 'regenerate',
      type: 'regenerate',
      label: 'Regenerate',
      icon: RefreshCw,
      onClick: () => console.log('Regenerate message:', message.id),
      disabled: message.role !== 'assistant',
    },
  ];

  const actions =
    message.metadata?.actions?.map((action) => ({
      ...action,
      type: (action as any).type || 'custom',
    })) || defaultActions;

  const renderReasoning = () => {
    if (!config?.showReasoning || !message.metadata?.reasoning) return null;

    return (
      <div className="midday-rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground/80 backdrop-blur-sm midday-shadow-sm">
        <p className="font-medium text-xs uppercase tracking-[0.2em] text-muted-foreground/60 midday-font-mono">Thinking</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground/70 midday-font-sans">
          {message.metadata.reasoning}
        </p>
      </div>
    );
  };

  const renderCodeBlocks = () => {
    if (!config?.showCodeBlocks || !message.metadata?.codeBlocks) return null;

    return (
      <div className="mt-3 space-y-3">
        {message.metadata.codeBlocks.map((codeBlock: CodeBlock) => (
          <div
            key={codeBlock.id}
            className="overflow-hidden midday-rounded-lg border border-border/30 bg-muted/20 shadow-inner backdrop-blur-sm midday-shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border/20 bg-background/60 px-3 py-2">
              <Badge className="bg-muted/50 text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground midday-font-mono">
                {(codeBlock.language || 'code').toUpperCase()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground midday-transition-colors"
                onClick={() => navigator.clipboard.writeText(codeBlock.code)}
              >
                <Copy className="mr-1 h-3 w-3" /> Copy
              </Button>
            </div>
            <pre className="overflow-x-auto px-3 py-3 text-xs leading-relaxed bg-muted/10 midday-font-mono">
              <code className="text-muted-foreground/90">{codeBlock.code}</code>
            </pre>
            {codeBlock.description && (
              <p className="border-t border-border/20 px-3 py-2 text-[12px] text-muted-foreground/70 midday-font-sans">
                {codeBlock.description}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSources = () => {
    if (!config?.showSources || !message.metadata?.sources) return null;

    return (
      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60 midday-font-mono">
          Sources
        </p>
        <ol className="space-y-1 text-sm midday-font-sans">
          {message.metadata.sources.map((source: Source, index: number) => (
            <li key={source.id} className="flex items-start gap-2">
              <span className="mt-0.5 text-[11px] font-semibold text-muted-foreground/60 midday-font-mono">
                {index + 1}.
              </span>
              <div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-foreground hover:text-muted-foreground midday-transition-colors"
                >
                  {source.title}
                </a>
                {source.snippet && (
                  <p className="text-[12px] text-muted-foreground/70">
                    {source.snippet}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  const renderAttachments = () => {
    if (!message.metadata?.attachments?.length) return null;

    return (
      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60 midday-font-mono">
          Attachments
        </p>
        {message.metadata.attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-3 midday-rounded-lg border border-dashed border-border/30 bg-background/40 px-3 py-2 text-sm backdrop-blur-sm midday-shadow-sm"
          >
            <span className="midday-rounded-full bg-muted/30 p-2 text-muted-foreground/70">
              <Paperclip className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[13px] font-medium text-foreground/90 midday-font-sans">
                {attachment.name}
              </p>
              <p className="text-[11px] text-muted-foreground/60 midday-font-mono">
                {attachment.type} • {Math.round(attachment.size / 1024)}KB
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground midday-transition-colors">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const renderReactions = () => {
    if (!config?.enableReactions || !message.metadata?.reactions?.length) return null;

    return (
      <div
        className={cn(
          'flex items-center gap-1 text-xs',
          isUser ? 'justify-end' : 'justify-start',
        )}
      >
        {message.metadata.reactions.map((reaction: MessageReaction) => (
          <Button
            key={reaction.emoji}
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 px-2 text-xs text-muted-foreground midday-transition-colors',
              reaction.userReacted && 'bg-primary/10 text-primary',
            )}
            onClick={() => handleReaction(reaction.emoji)}
          >
            {reaction.emoji} {reaction.count}
          </Button>
        ))}
      </div>
    );
  };


  return (
    <TooltipProvider>
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full"
      >
        <div className={cn(
          'flex gap-3 w-full max-w-3xl mx-auto px-4 py-3',
          isUser ? 'flex-row-reverse' : 'flex-row',
          className
        )}>
          <div
            className={cn(
              'flex-shrink-0 h-8 w-8 midday-rounded-full flex items-center justify-center text-xs font-semibold text-white',
              isUser ? 'midday-bg-primary' : 'midday-bg-secondary'
            )}
          >
            {message.role === 'assistant' ? 'AI' : 'Yo'}
          </div>

          <div className={cn(
            'flex-1 min-w-0 space-y-1.5',
            isUser ? 'text-right' : 'text-left'
          )}>
            <div className={cn(
              'flex items-center gap-2 text-xs',
              isUser ? 'justify-end' : 'justify-start'
            )}>
              <span className={cn(
                'font-medium midday-font-sans',
                isUser ? 'midday-chat-user-text' : 'midday-chat-assistant-text'
              )}>
                {message.role === 'assistant' ? 'F.B/c AI' : 'You'}
              </span>
              <span className="midday-text-muted">•</span>
              <span className="midday-text-muted midday-font-mono">
                {formatTimestamp(message.timestamp)}
              </span>
              {message.status && message.status !== 'read' && (
                <StatusIcon className={cn('h-3 w-3', statusColor.replace('text-', 'text-').replace('500', '/60').replace('600', '/70'))} />
              )}
              {message.error && (
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-3 w-3 text-red-500/70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs midday-font-sans">{message.error}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className={cn(
              'midday-message-bubble',
              isUser ? 'midday-message-user' : 'midday-message-assistant'
            )}>
              <div className="space-y-3">
                <div className="whitespace-pre-wrap midday-font-sans">
                  {message.content}
                </div>
                {renderReasoning()}
                {renderCodeBlocks()}
                {renderSources()}
                {renderAttachments()}
              </div>
            </div>

            {renderReactions()}

            {config?.showActions && (
              <div className={cn(
                'flex items-center gap-1',
                isUser ? 'justify-end' : 'justify-start'
              )}>
                {actions.map((action) => (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-7 w-7 p-0',
                          'midday-text-muted hover:midday-text-accent',
                          'midday-transition-colors'
                        )}
                        onClick={() => handleAction(action)}
                        disabled={action.disabled}
                      >
                        {typeof action.icon === 'string' ? (
                          <span className="text-[10px] font-semibold uppercase">
                            {action.icon}
                          </span>
                        ) : action.icon ? (
                          <action.icon className="h-3 w-3" />
                        ) : null}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs midday-font-sans">{action.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}

                {config?.enableReactions && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 w-7 p-0',
                        'midday-text-muted hover:midday-text-accent',
                        'midday-transition-colors'
                      )}
                      onClick={() => setShowReactions((prev) => !prev)}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <AnimatePresence>
                      {showReactions && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          className={cn(
                            'absolute bottom-full left-0 mb-2 flex gap-1',
                            'midday-rounded-lg border midday-border-secondary bg-background/80 px-2 py-1',
                            'midday-shadow-md',
                            isUser ? 'right-0 left-auto' : 'left-0 right-auto'
                          )}
                        >
                          {defaultReactions.map((emoji) => (
                            <Button
                              key={emoji}
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'h-6 w-6 p-0 text-base',
                                'hover:bg-muted/20 midday-transition-colors'
                              )}
                              onClick={() => handleReaction(emoji)}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
