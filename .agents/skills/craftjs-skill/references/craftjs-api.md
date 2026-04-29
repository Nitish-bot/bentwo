# Craft.js Hooks & API

## useNode()
Used strictly inside User Components to hook the rendered DOM into the global Editor state. Important: ensure `connect` (and `drag` if applicable) are passed specifically to a DOM node which takes up space, otherwise the Positioner won't detect drop indexing correctly.

```jsx
import React from 'react';
import { useNode } from "@craftjs/core";

// using forwardRef ensures our component can be safely wrapped by other components
// while still giving Craft elements the exact DOM measurement for drop indicators.
export const MyComponent = React.forwardRef(({ text }, externalRef) => {
  const { connectors: { connect, drag }, actions: { setProp } } = useNode();

  return (
    // 'connect' registers the DOM element for selection
    // 'drag' attaches drag handles
    <div ref={(ref) => {
       if (externalRef) {
         if (typeof externalRef === 'function') externalRef(ref);
         else externalRef.current = ref;
       }
       connect(drag(ref));
     }}>
      {text}
      
      {/* Mutating Props */}
      <button onClick={() => setProp(props => props.text = "Updated!")}>
        Change Text
      </button>
    </div>
  );
})

// User Component Static Configuration
MyComponent.craft = {
  props: { text: "Default" },
  rules: { canDrag: () => true },
  related: {
    // settings: MyComponentSettingsToolbar
  }
}
```

## useEditor() and Reordering
Used anywhere within the `<Editor>` tree to query or modify global Editor state.

```jsx
import { useEditor, useNode } from "@craftjs/core";

export const MoveNodeButtons = () => {
    // Assuming this component is rendered in the Settings Toolbar
    // We query the currently selected Node
    const { id, parentId } = useNode(); 
    const { actions, query } = useEditor();

    const parentNode = query.node(parentId).get();
    if (!parentNode) return null;

    // We can find the current index of this node amongst its siblings 
    const currentSiblings = parentNode.data.nodes; 
    const index = currentSiblings.indexOf(id);

    // Provide programmatic Reordering via actions.move
    return (
        <div>
            <button 
              disabled={index === 0} 
              onClick={() => actions.move(id, parentId, index - 1)}>
              Move Up
            </button>
            <button 
              disabled={index === currentSiblings.length - 1} 
              onClick={() => actions.move(id, parentId, index + 1)}>
              Move Down
            </button>
        </div>
    )
}

export const GlobalToolbar = () => {
  const { actions, query, connectors } = useEditor();

  const handleSave = () => {
    const json = query.serialize(); // Output JSON of entire node tree
    console.log(json);
  };

  return (
    <div>
      <button onClick={() => actions.history.undo()}>Undo</button>
      
      {/* 'create' connector allows dragging fresh components directly into the canvas */}
      <button ref={ref => connectors.create(ref, <MyComponent text="New" />)}>
        Drag into Canvas
      </button>
    </div>
  )
}
```

## Setup Elements (<Editor> & <Frame>)
- `<Editor>` maintains the context. Must supply `resolver={{ Component1, Component2 }}`.
- `<Frame>` acts as the tree root initialization.

```jsx
<Editor resolver={{ MyComponent }}>
  <Frame>
    {/* DO NOT use <Canvas>, use <Element canvas={true} /> */}
    <Element is="div" canvas={true}>
      <MyComponent text="Initial load" />
    </Element>
  </Frame>
</Editor>
```
