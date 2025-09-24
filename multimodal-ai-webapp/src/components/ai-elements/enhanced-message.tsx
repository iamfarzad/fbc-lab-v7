import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  EnhancedChatMessage, 
  MessageAction, 
  MessageReaction, 
  AIElementConfig,
  CodeBlock,
  Source,
  Artifact
} from '../../types/chat-enhanced';
import { useAIElements } from '../../hooks/useAIElements';
import { 
  Copy, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Share, 
  Download, 
  Check, 
  Clock, 
  AlertCircle,
  ThumbsUp,
  Heart,
  Laugh,
  Frown,
  MessageCircle,
  Paperclip,
  Image,
  Mic,
  Monitor
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
    transition: { duration: 0.3, ease: 'easeOut' as const }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2, ease: 'easeIn' as const }
  }
};

const statusIcons: Record<string, React.ComponentType<any>> = {
  sending: Clock,
  sent: Check,
  delivered: Check,
  read: Check,
  error: AlertCircle,
  failed: AlertCircle
};

const statusColors: Record<string, string> = {
  sending: 'text-yellow-500',
  sent: 'text-blue-500',
  delivered: 'text-green-500',
  read: 'text-green-600',
  error: 'text-red-500',
  failed: 'text-red-600'
};

const typeIcons: Record<string, React.ComponentType<any>> = {
  text: MessageCircle,
  voice: Mic,
  image: Image,
  screen: Monitor,
  code: MessageCircle,
  reasoning: MessageCircle
};

const defaultReactions = ['👍', '❤️', '😄', '😢'];

export function EnhancedMessage({ 
  message, 
  config, 
  onAction, 
  onReaction,
  className = '' 
}: EnhancedMessageProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const { executeAction } = useAIElements();

  const handleAction = useCallback((action: MessageAction) => {
    if (onAction) {
      onAction(action);
    } else {
      executeAction(action);
    }
  }, [onAction, executeAction]);

  const handleReaction = useCallback((emoji: string) => {
    if (onReaction) {
      onReaction(emoji);
    }
    setShowReactions(false);
  }, [onReaction]);

  const toggleElement = useCallback((elementId: string) => {
    setExpandedElements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementId)) {
        newSet.delete(elementId);
      } else {
        newSet.add(elementId);
      }
      return newSet;
    });
  }, []);

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  const StatusIcon = statusIcons[message.status || 'sent'];
  const TypeIcon = typeIcons[message.type || 'text'];
  const statusColor = statusColors[message.status || 'sent'];

  const defaultActions: MessageAction[] = [
    {
      id: 'copy',
      type: 'copy',
      label: 'Copy',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(message.content)
    },
    {
      id: 'edit',
      type: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: () => console.log('Edit message:', message.id),
      disabled: message.role !== 'user'
    },
    {
      id: 'regenerate',
      type: 'regenerate',
      label: 'Regenerate',
      icon: RefreshCw,
      onClick: () => console.log('Regenerate message:', message.id),
      disabled: message.role !== 'assistant'
    }
  ];

  const actions = message.metadata?.actions?.map(action => ({
    ...action,
    type: (action as any).type || 'custom' // Ensure type property exists
  })) || defaultActions;

  const renderCodeBlocks = () => {
    if (!config?.showCodeBlocks || !message.metadata?.codeBlocks) return null;

    return (
      <div className="space-y-2 mt-3">
        {message.metadata.codeBlocks.map((codeBlock: CodeBlock) => (
          <Card key={codeBlock.id} className="bg-muted/50">
            <div className="mb-2 px-3 pt-3">
              <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                {codeBlock.language}
              </Badge>
            </div>
            <Collapsible open={expandedElements.has(codeBlock.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">
                      {codeBlock.title || 'code'}
                    </CardTitle>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <pre className="text-sm overflow-x-auto">
                    <code>{codeBlock.code}</code>
                  </pre>
                  {codeBlock.description && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {codeBlock.description}
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    );
  };

  const renderSources = () => {
    if (!config?.showSources || !message.metadata?.sources) return null;

    return (
      <div className="space-y-3 mt-3">
        {/* Component-style sources */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Sources</h4>
          {message.metadata.sources.map((source: Source) => (
            <Card key={source.id} className="bg-muted/30">
              <CardContent className="p-3">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {source.title}
                </a>
                {source.snippet && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {source.snippet}
                  </p>
                )}
                {source.relevanceScore && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Score: {Math.round(source.relevanceScore * 100)}%
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Markdown-style sources */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">**Sources:**</h4>
          <div className="text-sm space-y-1">
            {message.metadata.sources.map((source: Source, index: number) => (
              <div key={`markdown-${source.id}`}>
                <span className="text-gray-500 mr-2">{index + 1}.</span>
                <a href={source.url} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:text-blue-800 underline">
                  {source.title}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReasoning = () => {
    if (!config?.showReasoning || !message.metadata?.reasoning) return null;

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-gray-700">**Thinking:**</h4>
          {message.metadata.reasoningDuration && (
            <Badge className="bg-[#FF6B35] text-white text-xs px-2 py-1 rounded-full">
              {message.metadata.reasoningDuration}ms
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">
          {message.metadata.reasoning}
        </p>
      </div>
    );
  };

  const renderAttachments = () => {
    if (!message.metadata?.attachments) return null;

    return (
      <div className="space-y-2 mt-3">
        <h4 className="text-sm font-semibold text-muted-foreground">Attachments</h4>
        {message.metadata.attachments.map(attachment => (
          <Card key={attachment.id} className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                {React.createElement(Paperclip, { className: "h-4 w-4 text-muted-foreground" })}
                <div className="flex-1">
                  <p className="text-sm font-medium">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.type} • {Math.round(attachment.size / 1024)}KB
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  {React.createElement(Download, { className: "h-3 w-3" })}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderReactions = () => {
    if (!config?.enableReactions || !message.metadata?.reactions) return null;

    return (
      <div className="flex items-center gap-1 mt-2">
        {message.metadata.reactions.map((reaction: MessageReaction) => (
          <Button
            key={reaction.emoji}
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-xs ${
              reaction.userReacted ? 'bg-primary/10' : ''
            }`}
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
        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''} ${className}`}
      >
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage 
            src={message.role === 'assistant' ? '/ai-avatar.png' : '/user-avatar.png'} 
            alt={message.role}
          />
          <AvatarFallback>
            {message.role === 'assistant' ? 'AI' : 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Message Content */}
        <div className={`flex-1 max-w-[70%] ${message.role === 'user' ? 'text-right' : ''}`}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">
              {message.role === 'assistant' ? 'AI Assistant' : 'You'}
            </span>
            {React.createElement(TypeIcon, { className: "h-3 w-3 text-muted-foreground" })}
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </span>
            {message.status && message.status !== 'read' && (
              React.createElement(StatusIcon, { className: `h-3 w-3 ${statusColor}` })
            )}
            {message.error && (
              <Tooltip>
                <TooltipTrigger>
                  {React.createElement(AlertCircle, { className: "h-3 w-3 text-red-500" })}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{message.error}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Message Body */}
          <Card className={`${message.role === 'user' ? 'bg-[#FF6B35] text-white' : 'bg-[#F5F5F5] text-gray-900'}`}>
            <CardContent className="p-3">
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>

              {/* AI Elements */}
              {renderReasoning()}
              {renderCodeBlocks()}
              {renderSources()}
              {renderAttachments()}

              {/* Reactions */}
              {renderReactions()}
            </CardContent>
          </Card>

          {/* Actions */}
          {config?.showActions && (
            <div className={`flex items-center gap-1 mt-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {actions.map(action => (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAction(action)}
                      disabled={action.disabled}
                    >
                      {action.icon && React.createElement(action.icon, { className: "h-3 w-3" })}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{action.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              
              {config.enableReactions && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowReactions(!showReactions)}
                  >
                    {React.createElement(ThumbsUp, { className: "h-3 w-3" })}
                  </Button>
                  
                  <AnimatePresence>
                    {showReactions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute bottom-full left-0 mb-2 bg-background border rounded-lg shadow-lg p-1 flex gap-1"
                      >
                        {defaultReactions.map(emoji => (
                          <Button
                            key={emoji}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-base"
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
      </motion.div>
    </TooltipProvider>
  );
}
