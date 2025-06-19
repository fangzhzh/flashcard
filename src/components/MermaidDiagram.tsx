
"use client";

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes'; 
import { Loader2 } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
}

let diagramIdCounter = 0;

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const { resolvedTheme } = useTheme(); // Use resolvedTheme to get the actual applied theme (light/dark)
  const [mermaidId] = useState(() => `mermaid-diagram-${diagramIdCounter++}`);
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const chartRef = useRef(chart); // Store chart in a ref to avoid re-renders if only theme changes

  useEffect(() => {
    chartRef.current = chart; // Keep ref updated if chart prop changes
  }, [chart]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setRenderedSvg(null);

    let mermaidTheme: 'default' | 'dark' | 'neutral' | 'forest' = 'default';
    if (resolvedTheme === 'dark') {
      mermaidTheme = 'dark';
    } else {
      mermaidTheme = 'default';
    }

    try {
        mermaid.initialize({
          startOnLoad: false,
          theme: mermaidTheme,
          // securityLevel: 'loose', // Consider for user input
          // logLevel: 'debug' // For troubleshooting
        });
    } catch (e) {
        // Mermaid might already be initialized with a different theme.
        // This is a common issue if initialize is called multiple times with different configs.
        // For simplicity, we'll try to proceed, but ideally, theme switching needs more robust handling
        // if `mermaid.initialize` itself errors on subsequent calls with different themes.
        console.warn("Mermaid initialization warning (may be benign if theme switching):", e);
    }


    const renderMermaid = async () => {
      if (chartRef.current) {
        try {
          // Ensure unique ID for rendering to prevent conflicts
          const tempId = `mermaid-temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const { svg } = await mermaid.render(tempId, chartRef.current);
          setRenderedSvg(svg);
          setError(null);
        } catch (e: any) {
          console.error("Mermaid rendering error:", e);
          setError(e.message || "Failed to render Mermaid diagram.");
          setRenderedSvg(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setRenderedSvg(null);
        setError(null);
        setIsLoading(false);
      }
    };

    // Debounce or delay rendering slightly if chart/theme changes rapidly
    const timerId = setTimeout(renderMermaid, 50); 

    return () => clearTimeout(timerId);
  }, [chartRef, resolvedTheme]); // Depend on resolvedTheme

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 my-2 border rounded-md min-h-[100px] bg-card text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading diagram...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 my-2 border border-destructive text-destructive bg-destructive/10 rounded-md text-xs">
        <p><strong>Mermaid Error:</strong></p>
        <pre className="whitespace-pre-wrap text-xs">{error}</pre>
        <p className="mt-1 text-xs">Chart definition:</p>
        <pre className="whitespace-pre-wrap text-xs bg-muted/50 p-1 rounded-sm">{chartRef.current}</pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram-container my-2 p-1 border rounded-md overflow-auto bg-card"
      dangerouslySetInnerHTML={renderedSvg ? { __html: renderedSvg } : undefined}
    />
  );
};

export default MermaidDiagram;
