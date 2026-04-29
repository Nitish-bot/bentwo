# Craft.js Architecture Concepts

## User Components
User Elements are React Elements manipulated by the end user within the editor. 
Craft.js treats them as standard React Components, but supplements them with a static `.craft` configuration property that registers default props, drag/drop rules, and related components.

## Nodes
Craft.js maintains an internal state using `Nodes` to represent and manage `User Elements`. A Node contains:
- The component type
- Current props
- Parent/child Node relationships
- The generated DOM element (`node.get().dom`)

Not all components automatically become Nodes. Nodes are formally created either by being at the top level of the `<Frame>` or explicitly using an `<Element>` component wrapper.

## Canvas Drop Zones 
A Canvas is a special variant of a Node representing a container/droppable region.
- A Node that is an immediate child of a Canvas becomes **draggable**.
- A Canvas node itself isn't draggable unless it is a child of another Canvas.

**DEPRECATION WARNING**: The `<Canvas />` component export is officially deprecated structurally in the source engine. **DO NOT USE IT.** Always instantiate drop zones via `<Element canvas={true} />`.

## Drag and Drop Architecture (Positioner)
Craft.js manages drag operations internally via its event handler connectors which leverage a `Positioner` matrix:
1. When a Node is dragged (via `connectors.drag(ref)`), a shadow DOM is cloned.
2. The `Positioner` scans the active tree to locate the nearest ancestor node marked as `canvas={true}` to designate the Drop Target context.
3. **CRITICAL FOR CUSTOMS**: The handler calculates `before` and `after` insertion indices strictly based on DOM Box intersect rendering (`left`, `outerWidth`, `top`, `outerHeight`). 
4. Therefore, your custom elements MUST explicitly pass their `ref` onto a physical DOM element that naturally sizes within its layout. If your component is a stateless function returning an inner block, you must use `React.forwardRef` to expose the dimension-carrying element to `connectors.connect` and `connectors.drag`.

## Defining Nodes Explicitly with `<Element>`
Inside a standard User Component, you may wish to introduce nested structural nodes or create droppable target areas. 

Use the `<Element>` component to declare new Nodes programmatically:
```jsx
import { Element } from "@craftjs/core";
import { NestedText } from "./NestedText";

export const Hero = () => {
  return (
    <div>
      {/* 1. Linked Node: A distinct, static Node bound to its parent via 'id' */}
      <Element id="hero_text" is={NestedText} text="Hero Title" />
      
      {/* 2. Canvas Node: A drop zone designated by the 'canvas' boolean prop */}
      <Element id="hero_zone" is="div" canvas={true}>
         <h2>Drop contents here</h2>
      </Element>
    </div>
  )
}
```
**Important**: Any `<Element>` created inside a User Component must specify a unique `id` prop to link it correctly to the parent Node.
