<template>
  <div
    ref="dockRef"
    class="relative p-1 rounded-2xl glass-pill-dock inline-flex items-center gap-1 select-none overflow-x-auto no-scrollbar max-w-full"
    :class="containerClass"
    role="tablist"
  >
    <!-- Sliding Animated Indicator (Liquid Glass Apple Thumb) -->
    <div
      class="absolute top-0 left-0 rounded-xl pointer-events-none z-0 will-change-transform"
      :class="indicatorClasses"
      :style="indicatorStyle"
    >
      <!-- Specular subtle highlight on top edge for realistic glass physics -->
      <div class="absolute inset-0 rounded-xl bg-gradient-to-b from-white/25 via-transparent to-transparent pointer-events-none opacity-70"></div>
    </div>

    <!-- Interactive Pill Items -->
    <button
      v-for="(item, idx) in normalizedItems"
      :key="item.value"
      :ref="el => setButtonRef(el, idx)"
      type="button"
      role="tab"
      :aria-selected="isSelected(item.value)"
      @click="selectItem(item.value, idx)"
      class="relative z-10 transition-colors duration-300 ease-out cursor-pointer active:scale-[0.97] flex items-center justify-center gap-1.5 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:focus-visible:ring-[#fcb4d5] text-center"
      :class="[
        sizeClasses,
        isSelected(item.value) ? activeTextClasses : inactiveTextClasses
      ]"
    >
      <!-- Optional Slot or Icon -->
      <slot v-if="slots.icon || item.icon" name="icon" :item="item">
        <span v-if="item.icon" class="inline-flex items-center shrink-0">
          <!-- Raw icon passed -->
        </span>
      </slot>

      <!-- Label: Mathematically centered with uniform leading -->
      <span class="tracking-tight leading-none select-none text-center inline-block">{{ item.label }}</span>

      <!-- Count Badge (e.g. for Materials) -->
      <span
        v-if="item.count !== undefined"
        class="text-[10px] px-1.5 py-0.5 rounded-full font-mono transition-colors duration-200 font-semibold leading-none inline-flex items-center justify-center"
        :class="isSelected(item.value) ? activeBadgeClasses : inactiveBadgeClasses"
      >
        {{ item.count }}
      </span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, useSlots } from 'vue';

const slots = useSlots();

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  items: {
    type: Array,
    required: true
  },
  variant: {
    type: String,
    default: 'solid', // 'solid' | 'soft' | 'glass'
    validator: v => ['solid', 'soft', 'glass'].includes(v)
  },
  size: {
    type: String,
    default: 'sm', // 'sm' | 'md' | 'lg'
    validator: s => ['sm', 'md', 'lg'].includes(s)
  },
  containerClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const dockRef = ref(null);
const buttonRefs = ref([]);
const setButtonRef = (el, idx) => {
  if (el) {
    buttonRefs.value[idx] = el;
  }
};
const isInitial = ref(true);

const indicatorStyle = ref({
  transform: 'translate3d(0, 0, 0)',
  width: '0px',
  height: '0px',
  opacity: 0,
  transition: 'none'
});

// Normalize items into { label, value, count?, icon? }
const normalizedItems = computed(() => {
  return props.items.map(item => {
    if (typeof item === 'string') {
      return {
        label: item,
        value: item === 'Все' ? '' : item
      };
    }
    return item;
  });
});

const isSelected = (val) => {
  return props.modelValue === val;
};

// Size classes for pill buttons: Symmetric vertical and horizontal padding
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'lg':
      return 'px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold min-w-[130px] min-h-[42px]';
    case 'md':
      return 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold min-w-[100px] min-h-[38px]';
    case 'sm':
    default:
      return 'px-3.5 py-1.5 rounded-xl text-xs font-bold min-h-[34px]';
  }
});

// Indicator visual styles based on variant
const indicatorClasses = computed(() => {
  switch (props.variant) {
    case 'soft':
      // Soft glowing translucent pill
      return 'bg-orange-500/15 dark:bg-[#fcb4d5]/20 border border-orange-500/35 dark:border-[#fcb4d5]/40 shadow-xs shadow-orange-500/15 dark:shadow-[#fcb4d5]/15 backdrop-blur-md';
    case 'glass':
    case 'solid':
    default:
      // Apple Transparent Liquid Frosted Glass thumb (Universal across light & dark themes)
      return 'bg-white/55 dark:bg-[#151620]/80 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.95),0_4px_16px_-2px_rgba(249,115,22,0.18)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_4px_20px_rgba(252,180,213,0.16)] border border-orange-500/30 dark:border-[#fcb4d5]/35 backdrop-blur-2xl';
  }
});

// Active text classes: Maintain constant font-bold to prevent layout shift
const activeTextClasses = computed(() => {
  return 'text-orange-600 dark:text-[#fcb4d5] font-bold';
});

// Inactive text classes: Same font-bold to guarantee identical letterform geometry
const inactiveTextClasses = computed(() => {
  return 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold hover:bg-white/40 dark:hover:bg-white/[0.04] rounded-xl';
});

// Badge styling
const activeBadgeClasses = computed(() => {
  return 'bg-orange-500/15 dark:bg-[#fcb4d5]/20 text-orange-600 dark:text-[#fcb4d5] border border-orange-500/25 dark:border-[#fcb4d5]/30';
});

const inactiveBadgeClasses = computed(() => {
  return 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-transparent';
});

// Calculate and move the indicator with subpixel perfection
const updateIndicator = (animated = true) => {
  nextTick(() => {
    if (!dockRef.value || normalizedItems.value.length === 0) return;

    const activeIdx = normalizedItems.value.findIndex(i => i.value === props.modelValue);
    if (activeIdx === -1 || !buttonRefs.value[activeIdx]) {
      indicatorStyle.value = {
        ...indicatorStyle.value,
        opacity: 0
      };
      return;
    }

    const btn = buttonRefs.value[activeIdx];
    const left = btn.offsetLeft;
    const top = btn.offsetTop;
    const width = btn.offsetWidth;
    const height = btn.offsetHeight;

    const transitionStyle = (animated && !isInitial.value)
      ? 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), width 0.36s cubic-bezier(0.22, 1, 0.36, 1), height 0.36s ease, opacity 0.22s ease'
      : 'none';

    indicatorStyle.value = {
      transform: `translate3d(${left}px, ${top}px, 0)`,
      width: `${width}px`,
      height: `${height}px`,
      opacity: 1,
      transition: transitionStyle
    };

    if (isInitial.value) {
      setTimeout(() => {
        isInitial.value = false;
      }, 50);
    }
  });
};

function selectItem(val, idx) {
  // Start immediate animation on click
  if (buttonRefs.value[idx]) {
    const btn = buttonRefs.value[idx];
    indicatorStyle.value = {
      transform: `translate3d(${btn.offsetLeft}px, ${btn.offsetTop}px, 0)`,
      width: `${btn.offsetWidth}px`,
      height: `${btn.offsetHeight}px`,
      opacity: 1,
      transition: 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), width 0.36s cubic-bezier(0.22, 1, 0.36, 1), height 0.36s ease, opacity 0.22s ease'
    };
  }
  emit('update:modelValue', val);
  emit('change', val);
}

watch(() => props.modelValue, () => {
  updateIndicator(true);
});

watch(() => props.items, () => {
  updateIndicator(false);
}, { deep: true });

let resizeObserver = null;
const handleResize = () => updateIndicator(false);

onMounted(() => {
  updateIndicator(false);
  if (typeof ResizeObserver !== 'undefined' && dockRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateIndicator(false);
    });
    resizeObserver.observe(dockRef.value);
  }
  window.addEventListener('resize', handleResize);
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => updateIndicator(false));
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('resize', handleResize);
});
</script>
