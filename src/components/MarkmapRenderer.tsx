
"use client";
import React, { useEffect, useRef, memo } from 'react';
import { Markmap } from 'markmap-view';
import { Transformer } from 'markmap-lib';

interface MarkmapRendererProps {
  markdownContent: string;
}

const MarkmapRenderer: React.FC<MarkmapRendererProps> = ({ markdownContent }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapInstanceRef = useRef<Markmap | null>(null);
  // It's generally better to instantiate Transformer outside useEffect if it doesn't depend on props/state changed by React
  // However, if Transformer had internal state that needed resetting, this might be different.
  // For markmap-lib, Transformer is stateless for its transform method.
  const transformer = new Transformer(); 

  useEffect(() => {
    if (svgRef.current) {
      if (markmapInstanceRef.current) {
        // If an instance exists, it's generally better to destroy it before creating a new one
        // to avoid memory leaks or issues if the library doesn't handle re-initialization well.
        // Markmap.create might handle this, but explicit cleanup is safer.
        // For markmap-view, there isn't an explicit destroy method on the Markmap class instance.
        // Re-calling Markmap.create on the same SVG element effectively replaces the old one.
        // So, clearing the SVG manually first might be a good practice if issues arise.
        svgRef.current.innerHTML = ''; // Clear previous content
      }

      if (markdownContent && markdownContent.trim() !== "") {
        try {
          const { root, features } = transformer.transform(markdownContent);
          // Pass features to Markmap.create if needed by your markmap-view version or configuration
          markmapInstanceRef.current = Markmap.create(svgRef.current, undefined, root);
        } catch (e) {
          console.error("Error rendering mindmap:", e);
          if (svgRef.current) { // Check svgRef.current again before manipulating
            svgRef.current.innerHTML = '<text x="10" y="20" fill="currentColor" class="text-destructive">Error rendering mindmap. Check console.</text>';
          }
        }
      } else {
        // If markdownContent is empty or whitespace, ensure the SVG is cleared
        markmapInstanceRef.current = null; // No active instance
      }
    }

    // No specific cleanup like markmapInstanceRef.current.destroy() needed for Markmap.create
    // as re-calling it on the same SVG effectively replaces the content.
    // The SVG element itself will be cleaned up by React when the component unmounts.
  }, [markdownContent, transformer]); // transformer is stable, so this primarily re-runs on markdownContent change

  return <svg ref={svgRef} className="w-full h-full min-h-[300px] bg-background rounded-md border" />;
};

export default memo(MarkmapRenderer);

