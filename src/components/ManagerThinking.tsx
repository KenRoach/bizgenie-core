import { useState, useEffect, useRef } from "react";
import { Brain, Search, Zap, Target, Bot, BookOpen, MessageSquare, Sparkles, CheckCircle2 } from "lucide-react";

const THINKING_SEQUENCES = [
  { icon: Brain, text: "Understanding your request...", color: "text-primary" },
  { icon: Search, text: "Scanning business context...", color: "text-blue-400" },
  { icon: Target, text: "Evaluating goals & priorities...", color: "text-amber-400" },
  { icon: Bot, text: "Coordinating with agents...", color: "text-emerald-400" },
  { icon: Zap, text: "Executing actions...", color: "text-primary" },
  { icon: BookOpen, text: "Saving insights to memory...", color: "text-violet-400" },
  { icon: MessageSquare, text: "Composing response...", color: "text-primary" },
];

// Contextual hints based on user message content
function getContextualSteps(userMessage: string): typeof THINKING_SEQUENCES {
  const msg = userMessage.toLowerCase();
  const steps = [{ icon: Brain, text: "Understanding your request...", color: "text-primary" }];

  if (msg.includes("agent") || msg.includes("spawn") || msg.includes("create")) {
    steps.push(
      { icon: Search, text: "Analyzing capability gaps...", color: "text-blue-400" },
      { icon: Bot, text: "Designing agent configuration...", color: "text-emerald-400" },
      { icon: Zap, text: "Spawning new agent...", color: "text-primary" },
    );
  } else if (msg.includes("goal") || msg.includes("aop") || msg.includes("plan") || msg.includes("strategy")) {
    steps.push(
      { icon: Search, text: "Reviewing current objectives...", color: "text-blue-400" },
      { icon: Target, text: "Structuring goal hierarchy...", color: "text-amber-400" },
      { icon: Zap, text: "Creating goals & milestones...", color: "text-primary" },
    );
  } else if (msg.includes("feedback") || msg.includes("complaint") || msg.includes("issue")) {
    steps.push(
      { icon: Search, text: "Analyzing feedback patterns...", color: "text-blue-400" },
      { icon: MessageSquare, text: "Categorizing & prioritizing...", color: "text-amber-400" },
      { icon: Zap, text: "Logging feedback entries...", color: "text-primary" },
    );
  } else {
    steps.push(
      { icon: Search, text: "Scanning business context...", color: "text-blue-400" },
      { icon: Target, text: "Evaluating priorities...", color: "text-amber-400" },
      { icon: Zap, text: "Taking action...", color: "text-primary" },
    );
  }

  steps.push(
    { icon: BookOpen, text: "Saving insights to memory...", color: "text-violet-400" },
    { icon: Sparkles, text: "Composing response...", color: "text-primary" },
  );

  return steps;
}

interface ManagerThinkingProps {
  userMessage?: string;
  elapsed?: number;
}

export default function ManagerThinking({ userMessage = "", elapsed = 0 }: ManagerThinkingProps) {
  const steps = useRef(getContextualSteps(userMessage)).current;
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dots, setDots] = useState("");

  // Progress through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          setCompletedSteps(c => [...c, prev]);
          return prev + 1;
        }
        return prev;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [steps.length]);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-card border border-border rounded-lg overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-secondary/30">
          <div className="relative flex items-center justify-center w-5 h-5">
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Brain className="w-4 h-4 text-primary relative z-10" />
          </div>
          <span className="text-xs font-medium text-foreground">Builder is working</span>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto tabular-nums">
            {elapsed > 0 ? `${elapsed}s` : ""}
          </span>
        </div>

        {/* Steps */}
        <div className="px-4 py-3 space-y-1">
          {steps.map((step, i) => {
            const isCompleted = completedSteps.includes(i);
            const isCurrent = i === currentStep;
            const isFuture = i > currentStep;
            const StepIcon = isCompleted ? CheckCircle2 : step.icon;

            if (isFuture) return null;

            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 py-1 transition-all duration-500 ${
                  isCurrent ? "opacity-100" : "opacity-50"
                } ${i === 0 && isCompleted ? "animate-fade-in" : "animate-fade-in"}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <StepIcon
                  className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                    isCompleted ? "text-success" : isCurrent ? step.color : "text-muted-foreground"
                  } ${isCurrent ? "animate-pulse" : ""}`}
                />
                <span
                  className={`text-xs transition-colors duration-300 ${
                    isCompleted ? "text-muted-foreground line-through" : isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {isCompleted ? step.text.replace("...", "") : isCurrent ? `${step.text.replace("...", "")}${dots}` : step.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-border/50 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/50 transition-all duration-700 ease-out"
            style={{ width: `${Math.min(((currentStep + 1) / steps.length) * 100, 95)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
