
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
  const transformer = new Transformer(); 

  useEffect(() => {
    if (svgRef.current) {
      if (markmapInstanceRef.current) {
        svgRef.current.innerHTML = ''; 
      }

      if (markdownContent && markdownContent.trim() !== "") {
        try {
          const { root, features } = transformer.transform(markdownContent);
          markmapInstanceRef.current = Markmap.create(svgRef.current, undefined, root);
        } catch (e) {
          console.error("Error rendering mindmap:", e);
          if (svgRef.current) { 
            svgRef.current.innerHTML = '<text x="10" y="20" fill="currentColor" class="text-destructive">Error rendering mindmap. Check console.</text>';
          }
        }
      } else {
        markmapInstanceRef.current = null; 
      }
    }
  }, [markdownContent, transformer]);

  return <svg ref={svgRef} className="w-full h-full bg-background rounded-md border" />;
};

export default memo(MarkmapRenderer);

