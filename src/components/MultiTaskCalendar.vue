<template>
  <div class="cyber-glass rounded-3xl p-4 sm:p-6 mb-8 border border-white/60 dark:border-white/10 shadow-sm relative overflow-hidden transition-all">
    <!-- Top Header: Month navigation & Quick actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
      <div class="flex items-center space-x-3">
        <!-- Calendar Icon Badge -->
        <div class="w-9 h-9 rounded-2xl bg-orange-500/10 dark:bg-[#fcb4d5]/15 border border-orange-500/20 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5] shadow-xs shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="14" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="14" r="1.5" fill="currentColor"/>
          </svg>
        </div>

        <div>
          <!-- Month & Year with Navigation Controls -->
          <div class="flex items-center space-x-2">
            <h2 class="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white capitalize">
              {{ currentMonthName }} {{ currentYear }}
            </h2>

            <div class="flex items-center space-x-1 ml-2">
              <button
                type="button"
                @click="prevMonth"
                title="Предыдущий месяц"
                class="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button
                type="button"
                @click="nextMonth"
                title="Следующий месяц"
                class="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button
                type="button"
                @click="goToToday"
                title="Перейти к текущему месяцу"
                class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors ml-1 cursor-pointer"
              >
                Сегодня
              </button>
            </div>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Нажмите на день в календаре для мгновенного перехода к мульти-задаче
          </p>
        </div>
      </div>

      <!-- Right controls: Filter active date vs All tasks toggle -->
      <div class="flex items-center space-x-2.5 self-start sm:self-auto flex-wrap">
        <button
          v-if="selectedDate"
          type="button"
          @click="clearDateFilter"
          class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <span>Сбросить выбор (показать все)</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-orange-500/10 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] border border-orange-500/20 dark:border-[#fcb4d5]/30">
          Задач в месяце: {{ monthEventsCount }}
        </span>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="w-full">
      <!-- Weekday column headers -->
      <div class="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <div v-for="(dayName, idx) in weekDays" :key="dayName" :class="{ 'text-orange-500/70 dark:text-[#fcb4d5]/70': idx >= 5 }">
          {{ dayName }}
        </div>
      </div>

      <!-- Days cells grid -->
      <div class="grid grid-cols-7 gap-1 sm:gap-2">
        <div
          v-for="cell in calendarCells"
          :key="cell.dateKey"
          @click="handleDayClick(cell)"
          class="relative min-h-[58px] sm:min-h-[70px] p-1.5 sm:p-2 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none group/cell"
          :class="getCellClasses(cell)"
        >
          <!-- Cell Top: Day number + Today indicator -->
          <div class="flex items-center justify-between w-full">
            <span
              class="text-xs sm:text-sm font-bold font-mono transition-colors"
              :class="getDayNumberClasses(cell)"
            >
              {{ cell.dayNumber }}
            </span>

            <span
              v-if="cell.isToday"
              class="w-2 h-2 rounded-full bg-orange-500 dark:bg-[#fcb4d5] shadow-xs ring-2 ring-orange-500/40 dark:ring-[#fcb4d5]/40"
              title="Сегодня"
            ></span>
          </div>

          <!-- Cell Bottom: Multi-task badges/indicators -->
          <div v-if="cell.events.length > 0" class="mt-auto pt-1 flex flex-col space-y-1">
            <!-- Event Pill on Desktop / Dot on Mobile -->
            <div
              v-for="ev in cell.events.slice(0, 2)"
              :key="ev.id"
              class="hidden sm:flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold truncate transition-transform group-hover/cell:scale-102"
              :class="ev.status === 'done' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25' : 'bg-orange-500/15 dark:bg-[#fcb4d5]/20 text-orange-700 dark:text-[#fcb4d5] border border-orange-500/25 dark:border-[#fcb4d5]/30'"
              :title="ev.title"
            >
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="ev.status === 'done' ? 'bg-emerald-500' : 'bg-orange-500 dark:bg-[#fcb4d5]'"></span>
              <span class="truncate">{{ ev.title }}</span>
            </div>

            <!-- Mobile compact dots + count badge -->
            <div class="flex sm:hidden items-center justify-center space-x-1">
              <span
                class="text-[9px] font-black font-mono px-1 py-0.2 rounded bg-orange-500 dark:bg-[#fcb4d5] text-white dark:text-black leading-tight"
              >
                {{ cell.events.length }}
              </span>
            </div>

            <!-- More indicator if > 2 events -->
            <div v-if="cell.events.length > 2" class="hidden sm:block text-[8px] font-mono text-slate-400 font-bold pl-1">
              + ещё {{ cell.events.length - 2 }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Jump Bar: Multi-tasks for the current Month or Selected Day -->
    <div class="mt-4 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08]">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span v-if="selectedDate">Мульти-задачи на {{ formatSelectedDateText }}:</span>
          <span v-else>Быстрый переход к мульти-задачам месяца:</span>
        </span>

        <span v-if="displayPillsEvents.length > 0" class="text-[10px] text-slate-400 font-mono">
          Кликните по задаче для перехода к ней ↓
        </span>
      </div>

      <!-- Carousel of Quick Jump Pills -->
      <div v-if="displayPillsEvents.length > 0" class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          v-for="ev in displayPillsEvents"
          :key="'pill-' + ev.id"
          type="button"
          @click="jumpToEvent(ev)"
          class="shrink-0 px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-all duration-200 cursor-pointer active:scale-95 group/pill"
          :class="getPillClasses(ev)"
          :title="ev.title"
        >
          <span class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
            {{ formatShortDay(ev.event_date) }}
          </span>
          <span class="truncate max-w-[170px] sm:max-w-[220px]">{{ ev.title }}</span>
          <svg class="w-3 h-3 text-slate-400 group-hover/pill:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <!-- No tasks message if selected date has 0 events -->
      <div v-else-if="selectedDate" class="py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span class="text-slate-500 dark:text-slate-400">
          На выбранную дату (<b class="text-slate-700 dark:text-slate-200">{{ formatSelectedDateText }}</b>) мульти-задач пока нет.
        </span>
        <button
          v-if="canCreate"
          type="button"
          @click="$emit('create-on-date', selectedDate)"
          class="text-xs font-bold text-orange-600 dark:text-[#fcb4d5] hover:underline flex items-center space-x-1 shrink-0"
        >
          <span>+ Создать мульти-задачу на эту дату</span>
        </button>
      </div>

      <div v-else class="text-xs text-slate-400 py-1 italic">
        В этом месяце пока нет запланированных мульти-задач.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: String,
    default: null
  },
  canCreate: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'jump-to-event', 'create-on-date']);

// Internal Calendar Navigation State
const todayDate = new Date();
const currentYear = ref(todayDate.getFullYear());
const currentMonth = ref(todayDate.getMonth()); // 0-indexed (0 = Jan, 9 = Oct)

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const currentMonthName = computed(() => monthNames[currentMonth.value]);

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value -= 1;
  } else {
    currentMonth.value -= 1;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value += 1;
  } else {
    currentMonth.value += 1;
  }
};

const goToToday = () => {
  currentYear.value = todayDate.getFullYear();
  currentMonth.value = todayDate.getMonth();
};

const selectedDate = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

// Format date helper: YYYY-MM-DD
const formatDateKey = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

// Map events by dateKey (YYYY-MM-DD)
const eventsByDate = computed(() => {
  const map = {};
  for (const ev of props.events) {
    const rawDate = ev.event_date || (ev.deadline ? ev.deadline.substring(0, 10) : null);
    if (!rawDate) continue;
    const dateKey = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.substring(0, 10);
    if (!map[dateKey]) {
      map[dateKey] = [];
    }
    map[dateKey].push(ev);
  }
  return map;
});

// Calculate total events for the displayed month
const monthEventsCount = computed(() => {
  const prefix = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`;
  let count = 0;
  for (const [key, evList] of Object.entries(eventsByDate.value)) {
    if (key.startsWith(prefix)) {
      count += evList.length;
    }
  }
  return count;
});

// Generate 35-42 calendar grid cells
const calendarCells = computed(() => {
  const y = currentYear.value;
  const m = currentMonth.value;

  // Day of week for 1st day of month (0 = Mon, 6 = Sun)
  const firstDayIndex = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInCurrentMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();

  const cells = [];
  const todayStr = formatDateKey(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

  // Previous month filler days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = m === 0 ? 11 : m - 1;
    const prevYear = m === 0 ? y - 1 : y;
    const dateKey = formatDateKey(prevYear, prevMonthIdx, dayNum);
    cells.push({
      dayNumber: dayNum,
      dateKey,
      isCurrentMonth: false,
      isToday: dateKey === todayStr,
      events: eventsByDate.value[dateKey] || []
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateKey = formatDateKey(y, m, d);
    cells.push({
      dayNumber: d,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayStr,
      events: eventsByDate.value[dateKey] || []
    });
  }

  // Next month filler days (fill up to multiple of 7)
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextMonthIdx = m === 11 ? 0 : m + 1;
      const nextYear = m === 11 ? y + 1 : y;
      const dateKey = formatDateKey(nextYear, nextMonthIdx, d);
      cells.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        events: eventsByDate.value[dateKey] || []
      });
    }
  }

  return cells;
});

// Click on day cell
const handleDayClick = (cell) => {
  if (selectedDate.value === cell.dateKey) {
    selectedDate.value = null; // Toggle off if clicked again
  } else {
    selectedDate.value = cell.dateKey;
    if (cell.events.length > 0) {
      // Jump to the first multi-task on this date
      emit('jump-to-event', cell.events[0]);
    }
  }
};

const jumpToEvent = (ev) => {
  selectedDate.value = ev.event_date ? ev.event_date.substring(0, 10) : null;
  emit('jump-to-event', ev);
};

const clearDateFilter = () => {
  selectedDate.value = null;
};

// Events displayed in quick-jump pill bar
const displayPillsEvents = computed(() => {
  if (selectedDate.value) {
    return eventsByDate.value[selectedDate.value] || [];
  }
  // If no date selected, show all events of the current month
  const prefix = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`;
  const list = [];
  for (const [key, evList] of Object.entries(eventsByDate.value)) {
    if (key.startsWith(prefix)) {
      list.push(...evList);
    }
  }
  return list;
});

const formatSelectedDateText = computed(() => {
  if (!selectedDate.value) return '';
  const parts = selectedDate.value.split('-');
  if (parts.length < 3) return selectedDate.value;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const mGenitive = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return `${day} ${mGenitive[monthIdx] || ''} ${parts[0]}`;
});

const formatShortDay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.substring(0, 10).split('-');
  if (parts.length < 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const mShort = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${day} ${mShort[monthIdx] || ''}`;
};

// Classes styling
const getCellClasses = (cell) => {
  const isSelected = selectedDate.value === cell.dateKey;
  const hasEvents = cell.events.length > 0;

  if (isSelected) {
    return 'bg-orange-500/15 dark:bg-[#fcb4d5]/20 border-orange-500 dark:border-[#fcb4d5] shadow-sm ring-2 ring-orange-500/30 dark:ring-[#fcb4d5]/30 z-10';
  }

  if (hasEvents) {
    return 'bg-white/70 dark:bg-white/[0.06] border-orange-300/80 dark:border-[#fcb4d5]/50 hover:border-orange-500 dark:hover:border-[#fcb4d5] hover:shadow-md';
  }

  if (!cell.isCurrentMonth) {
    return 'bg-transparent border-transparent opacity-25 hover:opacity-50';
  }

  return 'bg-white/30 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.05] hover:bg-white/60 dark:hover:bg-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1]';
};

const getDayNumberClasses = (cell) => {
  if (selectedDate.value === cell.dateKey) {
    return 'text-orange-600 dark:text-[#fcb4d5] font-black scale-105';
  }
  if (cell.events.length > 0) {
    return 'text-slate-900 dark:text-white font-black';
  }
  if (!cell.isCurrentMonth) {
    return 'text-slate-400 dark:text-slate-600';
  }
  return 'text-slate-700 dark:text-slate-300';
};

const getPillClasses = (ev) => {
  const isHighlighted = selectedDate.value && ev.event_date && ev.event_date.startsWith(selectedDate.value);
  if (isHighlighted) {
    return 'bg-orange-500 text-white dark:bg-[#fcb4d5] dark:text-[#0f0f14] border-orange-600 dark:border-[#fcb4d5] shadow-xs';
  }
  return 'bg-white/80 dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-orange-400 dark:hover:border-[#fcb4d5] text-slate-800 dark:text-slate-200';
};
</script>
