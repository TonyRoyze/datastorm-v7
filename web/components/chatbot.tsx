"use client";

import React, { useState } from "react";
import { usePageContext } from "./page-context";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const { pageData } = usePageContext();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          context: pageData || "No context available.",
          isInitialInsight: false,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "ai", content: data.result }]);
      } else {
        setMessages((prev) => [...prev, { role: "ai", content: `Error: ${data.error}` }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", content: "Failed to connect to AI." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all z-50 ${isOpen ? "hidden" : "block"}`}
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[350px] h-[500px] flex flex-col shadow-2xl z-50 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle size={18} />
              Data Analyst AI
            </CardTitle>
            <button onClick={() => setIsOpen(false)} className="hover:text-primary-foreground/80">
              <X size={18} />
            </button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground mt-4">
                Ask me a question about the data on this page!
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground self-end rounded-br-none"
                      : "bg-muted text-foreground self-start rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              ))
            )}
            {isLoading && (
              <div className="self-start bg-muted text-foreground p-3 rounded-lg rounded-bl-none">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>

          <CardFooter className="p-3 border-t">
            <form
              className="flex w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              <input
                type="text"
                placeholder="Ask about this data..."
                className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
