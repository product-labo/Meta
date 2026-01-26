'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

export function SuggestedQuestions({ questions, onQuestionClick }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-sm font-medium text-muted-foreground mb-2">
        Suggested questions:
      </p>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {questions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onQuestionClick(question)}
              className="whitespace-nowrap text-xs h-8 px-3 flex-shrink-0"
            >
              {question}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}