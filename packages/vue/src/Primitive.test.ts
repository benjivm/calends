import { createCommentVNode, Fragment, h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { Primitive } from './Primitive.js';

describe('Primitive', () => {
    it('renders a div by default, with its attributes', () => {
        const wrapper = mount(Primitive, {
            attrs: { 'data-today': '' },
            slots: { default: () => 'Day' },
        });

        expect(wrapper.element.tagName).toBe('DIV');
        expect(wrapper.attributes('data-today')).toBe('');
        expect(wrapper.text()).toBe('Day');
    });

    it('renders the element or component given to as, and follows changes to it', async () => {
        const wrapper = mount(Primitive, { props: { as: 'button' } });

        expect(wrapper.element.tagName).toBe('BUTTON');

        await wrapper.setProps({ as: 'span' });

        expect(wrapper.element.tagName).toBe('SPAN');
    });

    it('renders self-closing tags without children', () => {
        const wrapper = mount(Primitive, { props: { as: 'input' }, attrs: { type: 'text' } });

        expect(wrapper.element.tagName).toBe('INPUT');
        expect(wrapper.attributes('type')).toBe('text');
    });

    it('merges into its child with as-child, keeping both classes and listeners', async () => {
        const outer = vi.fn();
        const inner = vi.fn();
        const wrapper = mount(Primitive, {
            props: { asChild: true },
            attrs: { class: 'outer', 'data-selected': '', onClick: outer },
            slots: { default: () => h('a', { href: '#', class: 'inner', onClick: inner }, 'Link') },
        });

        expect(wrapper.element.tagName).toBe('A');
        expect(wrapper.classes()).toEqual(['outer', 'inner']);
        expect(wrapper.attributes('data-selected')).toBe('');

        await wrapper.trigger('click');

        expect(outer).toHaveBeenCalledOnce();
        expect(inner).toHaveBeenCalledOnce();
    });

    it('skips comments and fragments to find the child for as-child', () => {
        const wrapper = mount({
            render: () =>
                h(Primitive, { asChild: true, id: 'merged' }, () => [
                    createCommentVNode('v-if'),
                    h(Fragment, [h('span', 'Inner')]),
                ]),
        });

        expect(wrapper.find('#merged').text()).toBe('Inner');
    });
});
