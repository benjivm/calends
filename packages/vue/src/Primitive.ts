import {
    cloneVNode,
    Comment,
    defineComponent,
    Fragment,
    h,
    mergeProps,
    type Component,
    type PropType,
    type VNode,
} from 'vue';

// Adapted from reka-ui's Primitive and Slot (MIT, Copyright (c) 2023 UnoVue), so reka-ui isn't a peer dependency.

export type AsTag =
    | 'a'
    | 'button'
    | 'div'
    | 'form'
    | 'h2'
    | 'h3'
    | 'img'
    | 'input'
    | 'label'
    | 'li'
    | 'nav'
    | 'ol'
    | 'p'
    | 'span'
    | 'svg'
    | 'ul'
    | 'template'
    | ({} & string);

export interface PrimitiveProps {
    /** Renders the single child instead of a wrapper, merging this element's attributes and listeners into it. */
    asChild?: boolean;
    /**
     * The element or component to render. Ignored with `asChild`.
     * @defaultValue "div"
     */
    as?: AsTag | Component;
}

const SELF_CLOSING_TAGS = ['area', 'img', 'input'];

function flattenFragments(children: VNode[]): VNode[] {
    return children.flatMap((child) =>
        child.type === Fragment ? flattenFragments(child.children as VNode[]) : [child],
    );
}

const Slot = defineComponent({
    name: 'PrimitiveSlot',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        return () => {
            if (!slots.default) return null;

            const children = flattenFragments(slots.default());
            const index = children.findIndex((child) => child.type !== Comment);

            if (index === -1) return children;

            const child = children[index]!;

            // The child's own template ref would otherwise point at the clone's source vnode.
            delete child.props?.ref;

            const cloned = cloneVNode(
                { ...child, props: {} },
                child.props ? mergeProps(attrs, child.props) : attrs,
            );

            if (children.length === 1) return cloned;

            children[index] = cloned;

            return children;
        };
    },
});

export const Primitive = defineComponent({
    name: 'Primitive',
    inheritAttrs: false,
    props: {
        asChild: { type: Boolean, default: false },
        as: { type: [String, Object] as PropType<AsTag | Component>, default: 'div' },
    },
    setup(props, { attrs, slots }) {
        return () => {
            const tag = props.asChild ? 'template' : props.as;

            if (tag === 'template') return h(Slot, attrs, { default: slots.default });

            if (typeof tag === 'string' && SELF_CLOSING_TAGS.includes(tag)) return h(tag, attrs);

            return h(tag, attrs, { default: slots.default });
        };
    },
});
