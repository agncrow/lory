# Component patterns

A gallery of small examples of how components are put together in Lory:
templates and what an expression binds, branches and lists, children slotted
into a component, components made of components, directives (values that
arrive over time, cached views, keyed lists, class and style maps), context
handed down, a signal shared by every instance, a task that loads and may
fail, and motion that measures where things were and where they are going.

A component here is a function of its state that answers a `lory.gui`
tree, and a function that answers its state after each event. What a page
would keep by itself, such as words typed into a field nothing is bound to,
is kept in the state too. The examples are grouped in a menu down the side;
the one chosen is drawn beside it and answers the mouse, the keyboard and
touch.

## Examples

| Group | Example | What it shows |
|---|---|---|
| Basics | Hello World | A greeting given its name |
| Basics | Full Component | A component with state, a style handed in from outside and an event |
| Properties | Basic Properties | Properties set from markup and from code |
| Properties | Change Detection | A property that counts as changed only when its day does |
| Properties | Custom Attribute Converter | An attribute read into a date by a converter of its own |
| Templates | Expression Types | Words, attributes, truths, properties and events bound in a template |
| Templates | Conditional Templates | One part or another drawn by a condition |
| Templates | Repeating and Conditional | A list drawn by a loop, its items filtered |
| Templates | Slotting Children | Children handed to a component and drawn inside it |
| Templates | Element Composition | Components made of components |
| Templates | Template Composition | Templates made of smaller templates |
| Directives | Appended as They Come | Coin tosses added to a list one a second |
| Directives | Replaced as They Come | A countdown, each value replacing the last |
| Directives | Cached Views | Two views switched, one made again each time and one kept |
| Directives | Class Map | A look made of classes switched on and off |
| Directives | Guarded Work | A digest worked out again only when its value changes, not when a counter moves |
| Directives | Only If Defined | A picture's address given only when its name is one it knows |
| Directives | Live Value | A field set again wherever the reader typed over it |
| Directives | Element Ref | A field that takes the focus and a paragraph scrolled into view |
| Directives | Keyed Repeat | A sorted list whose checkboxes move with their items, or stay |
| Directives | Style Map | The class map's look, made of styles |
| Directives | Template Content | Content stamped from a template |
| Directives | Raw Markup | Simple markup read into headings and paragraphs |
| Directives | Raw Drawing | A circle read from drawing markup |
| Directives | Until Ready | A placeholder until the content comes |
| Managing Data | Async Tasks | A package looked up after a second, from sample data: loading, its facts, or an error |
| Managing Data | Context Basics | Data handed from a provider to the consumer inside it |
| Managing Data | Context Consume and Provide | Sections that each provide one level more to the headings inside |
| Managing Data | Signals | Two counters sharing one count |
| Slots, Events and Refs | Click Roulette | A child that tells its parent by events, the parent showing its message |
| Slots, Events and Refs | Named Slots | Children placed in a component's named slots, in order |
| Slots, Events and Refs | Driven by a Ref | A player with its own state, played and paused from outside |
| Motion | Sliding Circle | A circle sliding to its new place |
| Motion | Letters Animation | Letters that fly in and out by themselves, paused by a press |
| Motion | List Item Animation | A list shuffled and laid out again, each item moving there |
| Motion | Grid Layout Transitions | A grid's areas moved to the next layout |
| Motion | Carousel Transitions | Cards moving through a carousel |
| Motion | List/Detail Hero Transition | A list's card growing into its detail |
| Motion | Todos List Transitions | Todos moving between two lists |
| More Patterns | Events up, properties down | A child tells its parent, and the parent hands the count to the child's sibling |
| More Patterns | A reactive controller | A clock ticked by its controller while it is shown |
| More Patterns | Batched updates | Changes made in one turn drawn as one update, or none while frozen |
| More Patterns | A slot's fallback | Content shown while nothing is slotted |
| More Patterns | Runtime localization | A locale switched while the page runs, loading for a moment |

## Using it

Two instances of a counter sharing one count, the pattern of a signal:

```crow
use sys
use memory
use lory
use lory.gui

struct Shared [count]

fn instance[title, id, count]
    gui.panel[[gui.heading[title], gui.text['count = `count`'], gui.button[id, 'Increment']]]

fn shared_view[s]
    gui.column[[instance['Instance 1', 'inc-1', s.count], instance['Instance 2', 'inc-2', s.count]]]

fn answered[s, e]
    if e.act eq 'press' and (e.id eq 'inc-1' or e.id eq 'inc-2')
        s.count = s.count + 1
    s

fn draw[frame]
    s = recall['shared', Shared[0]]
    c = lory.begin[frame]
    c = lory.clear[c, gui.light[].page]
    shown = gui.show[c, shared_view[s]]
    for e in shown.events
        s = answered[s, e]
    remember['shared', s]
    lory.end[shown.canvas]

sys.frames[draw]
```

## In a headset

The gallery is a panel: an example's controls are pressed by the
controller's ray, and the thumbstick scrolls the menu the ray rests on.

## Try it

[Open the component patterns](../../examples/patterns/)
