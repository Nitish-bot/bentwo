#!/usr/bin/env python3
import sys
import argparse

def generate_component(name):
    template = f"""import React from "react";
import {{ useNode }} from "@craftjs/core";

export const {name} = React.forwardRef(({{ background, text }}, externalRef) => {{
  const {{ connectors: {{ connect, drag }} }} = useNode();
  
  return (
    <div 
        ref={{(ref) => {{
           if (externalRef) {{
             if (typeof externalRef === 'function') externalRef(ref);
             else externalRef.current = ref;
           }}
           connect(drag(ref));
        }}}} 
        style={{{{ background, padding: "10px" }}}}>
      <h3>{{text}}</h3>
    </div>
  );
}});

{name}.craft = {{
  displayName: "{name}",
  props: {{
    background: "#ffffff",
    text: "New {name}"
  }},
  rules: {{
    canDrag: () => true,
  }},
  related: {{
    // settings: {name}Settings
  }}
}};
"""
    print(template)
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scaffold a Craft.js User Component")
    parser.add_argument("name", help="Name of the component")
    args = parser.parse_args()
    
    generate_component(args.name)
