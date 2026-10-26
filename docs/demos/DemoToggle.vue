<script setup lang="ts">
const checked = defineModel<boolean>({ required: true });

defineProps<{ label: string }>();
</script>

<template>
    <label class="flex items-center gap-1.5">
        <input
            v-model="checked"
            type="checkbox"
        />
        {{ label }}
    </label>
</template>
