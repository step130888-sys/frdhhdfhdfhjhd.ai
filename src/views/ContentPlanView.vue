<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
    
    <!-- Top Bar: Header and View Mode Switcher (Static right) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <div class="flex items-center space-x-3 mb-1">
          <div class="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-[#fcb4d5]/15 border border-orange-500/20 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5] shadow-xs">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
              <path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>
            </svg>
          </div>
          <h1 class="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Контент-план медиацентра
          </h1>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Координация задач и мульти-проектов 5 цехов («Фото», «Дизайн», «Видео», «Моушен», «СММ») в режиме реального времени.
        </p>
      </div>

      <!-- Static Right Mode Switcher Panel (Apple Animated Liquid Glass Pill Dock) -->
      <div class="shrink-0 sm:self-center">
        <AnimatedPills
          v-model="viewMode"
          :items="modeTabs"
          variant="glass"
          size="lg"
        >
          <template #icon="{ item }">
            <svg v-if="item.value === 'calendar'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
            <svg v-else-if="item.value === 'list'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <path d="m9 14 2 2 4-4"/>
            </svg>
          </template>
        </AnimatedPills>
      </div>
    </div>

    <!-- Mode Swipe Transition -->
    <transition name="tab-swipe" mode="out-in">

    <!-- CALENDAR VIEW MODE: Multi-tasks with 1 to 5 flexible departments -->
    <div v-if="viewMode === 'calendar'" key="calendar" class="space-y-6">
      
      <!-- Sub-Header Info & Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl cyber-glass shadow-xs transition-colors">
        <div class="flex items-center space-x-2.5 text-xs">
          <div class="w-6 h-6 rounded-lg bg-orange-50 dark:bg-rose-500/15 border border-orange-200 dark:border-rose-400/30 flex items-center justify-center text-orange-600 dark:text-rose-300 flex-shrink-0">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
              <path d="M9 18h6"/>
              <path d="M10 22h4"/>
            </svg>
          </div>
          <div>
            <span class="text-orange-600 dark:text-rose-300 font-bold">Мульти-задачи в календаре: </span>
            <span class="text-slate-600 dark:text-slate-400">Руководство (3-4 ур.) может создавать мульти-задачи с любым числом цехов (от 1 до 5) и редактировать их.</span>
          </div>
        </div>

        <div class="flex items-center space-x-3 shrink-0 self-start sm:self-auto">
          <button
            @click="fetchCalendarEvents"
            class="text-xs text-orange-600 dark:text-rose-300 hover:text-orange-800 dark:hover:text-rose-200 font-mono flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-rose-500/15 border border-orange-200 dark:border-rose-500/20 hover:border-orange-300 dark:hover:border-rose-400/40 transition-colors"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
            <span>Обновить</span>
          </button>

          <!-- Button in Calendar mode: Create Multi-task (Level 3-4 only) -->
          <button
            v-if="isLeader"
            @click="openCreateMultiTask"
            class="btn-neon px-4 py-2 rounded-xl text-xs font-black text-white shadow-md flex items-center space-x-2"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <span>Создать мульти-задачу</span>
          </button>
        </div>
      </div>

      <!-- TOP CALENDAR WIDGET: Month Grid + Quick Multi-Task Navigation -->
      <MultiTaskCalendar
        v-model="calendarSelectedDate"
        :events="calendarEvents"
        :can-create="isLeader"
        @jump-to-event="onJumpToMultiTask"
        @create-on-date="onCreateOnDate"
      />

      <!-- Multi-tasks Section Header & Filter Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-1 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div class="flex items-center space-x-2.5">
          <div class="w-2.5 h-2.5 rounded-full bg-orange-500 dark:bg-[#fcb4d5] animate-pulse"></div>
          <h2 class="text-sm sm:text-base font-black uppercase tracking-wider text-slate-800 dark:text-white">
            <template v-if="calendarSelectedDate && filterByDateOnly">
              Мульти-задачи на {{ formatFilterDateTitle(calendarSelectedDate) }}
            </template>
            <template v-else>
              Все мульти-задачи медиацентра
            </template>
          </h2>
          <span class="text-xs font-mono font-bold text-slate-400">
            ({{ displayedCalendarEvents.length }})
          </span>
        </div>

        <!-- Filter & View Controls -->
        <div class="flex items-center space-x-3 text-xs">
          <!-- Toggle: Filter by selected date -->
          <label
            v-if="calendarSelectedDate"
            class="flex items-center space-x-2 cursor-pointer px-3 py-1.5 rounded-xl bg-orange-500/10 dark:bg-[#fcb4d5]/15 border border-orange-500/20 dark:border-[#fcb4d5]/30 text-orange-700 dark:text-[#fcb4d5] font-bold"
          >
            <input
              type="checkbox"
              v-model="filterByDateOnly"
              class="rounded text-orange-500 focus:ring-orange-500/20 cursor-pointer"
            />
            <span>Показывать только выбранную дату</span>
          </label>

          <button
            v-if="calendarSelectedDate && filterByDateOnly"
            type="button"
            @click="clearDateFilter"
            class="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white underline cursor-pointer"
          >
            Показать все даты
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="calendarLoading" class="text-center py-20 text-slate-400 text-xs font-medium">
        <div class="animate-spin w-8 h-8 border-2 border-orange-500 dark:border-rose-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        Загрузка событий календаря...
      </div>

      <!-- Empty State -->
      <div v-else-if="displayedCalendarEvents.length === 0" class="cyber-glass rounded-3xl p-12 text-center text-slate-400 max-w-md mx-auto">
        <div class="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-rose-500/10 border border-orange-200 dark:border-rose-500/20 flex items-center justify-center text-orange-500 dark:text-rose-400 mx-auto mb-4">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
        </div>
        <div class="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Событий календаря пока нет</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Создайте мульти-задачу для автоматической координации цехов.
        </p>
        <button
          v-if="isLeader"
          @click="openCreateMultiTask"
          class="btn-neon px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md inline-flex items-center space-x-2"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <span>Создать мульти-задачу</span>
        </button>
      </div>

      <!-- Multi-task Cards Timeline -->
      <div v-else class="space-y-8">
        <div
          v-for="ev in displayedCalendarEvents"
          :key="ev.id"
          :id="'multitask-' + ev.id"
          @click="openDetailMultiTask(ev)"
          class="cyber-glass rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer group/card scroll-mt-24"
          :class="{
            'ring-4 ring-orange-500/80 dark:ring-[#fcb4d5] shadow-2xl scale-[1.01] -translate-y-0.5': highlightedEventId === ev.id
          }"
          title="Нажмите на карточку для просмотра деталей мульти-задачи"
        >
          <!-- Multi-task Header (Liquid Glass) -->
          <div class="p-5 md:p-6 bg-white/40 dark:bg-white/[0.04] backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-start md:items-center space-x-4">
              <!-- Date Badge -->
              <div class="flex-shrink-0 text-center px-4 py-2.5 rounded-2xl bg-orange-50 dark:bg-rose-500/15 border border-orange-200 dark:border-rose-400/30 shadow-xs group-hover/card:border-orange-400 dark:group-hover/card:border-rose-400/50 transition-colors">
                <div class="text-[10px] text-orange-600 dark:text-rose-400 font-mono uppercase font-black">ДАТА</div>
                <div class="text-lg md:text-xl font-black text-slate-800 dark:text-white font-mono leading-tight">
                  {{ formatDateDay(ev.event_date) }}
                </div>
                <div class="text-[10px] text-orange-600 dark:text-rose-300 font-mono font-bold">
                  {{ formatDateMonth(ev.event_date) }}
                </div>
              </div>

              <div>
                <div class="flex items-center space-x-2.5 mb-1">
                  <h3 class="text-base md:text-lg font-black text-slate-800 dark:text-white group-hover/card:text-orange-600 dark:group-hover/card:text-rose-300 transition-colors">{{ ev.title }}</h3>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono"
                    :class="ev.status === 'done' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : 'bg-orange-50 dark:bg-rose-500/15 text-orange-700 dark:text-rose-300 border-orange-200 dark:border-rose-500/30'"
                  >
                    {{ ev.status === 'done' ? 'Завершено' : 'В работе' }}
                  </span>
                </div>
                <p v-if="ev.description" class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-2xl">
                  {{ ev.description }}
                </p>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-4">
                  <span v-if="ev.deadline" class="flex items-center space-x-1">
                    <svg class="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>Дедлайн: <b class="text-amber-600 dark:text-amber-400">{{ ev.deadline }}</b></span>
                  </span>
                  <span>Цехов задействовано: <b class="text-orange-600 dark:text-rose-300">{{ ev.subtasks ? ev.subtasks.length : 0 }}</b></span>
                </div>
              </div>
            </div>

            <!-- Leadership Controls (Removed workshop dot circles per user instruction) -->
            <div class="flex items-center space-x-2 text-xs self-start md:self-auto flex-wrap gap-y-1.5">
              <!-- Edit Multi-Task button (Level 3-4 only) -->
              <button
                v-if="isLeader && ev.id < 900000"
                @click.stop="openEditMultiTask(ev)"
                class="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-rose-500/20 hover:bg-orange-100 dark:hover:bg-rose-500/30 text-orange-700 dark:text-rose-200 border border-orange-200 dark:border-rose-400/30 transition-all font-bold flex items-center space-x-1.5 shadow-2xs"
                title="Редактировать мульти-задачу и подразделения"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="m15 5 4 4"/>
                </svg>
                <span>Редактировать</span>
              </button>
            </div>
          </div>

          <!-- Subtasks Grid: Liquid Glass Translucent Surface -->
          <div class="p-5 md:p-6 bg-white/20 dark:bg-black/25 backdrop-blur-2xl transition-colors">
            <div v-if="!ev.subtasks || ev.subtasks.length === 0" class="text-xs text-slate-400 italic py-2">
              В этой мульти-задаче пока нет подзадач.
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              <div
                v-for="st in ev.subtasks"
                :key="st.id"
                @click.stop="$router.push(`/task/${st.id}`)"
                class="rounded-2xl p-3.5 border transition-all duration-200 flex flex-col justify-between cursor-pointer group"
                :class="getSubtaskCardClasses(st)"
              >
                <!-- Workshop Header -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-black uppercase tracking-wider flex items-center space-x-1.5" :class="getDirColor(st.direction)">
                      <!-- Workshop Lucide Icon -->
                      <svg v-if="st.direction === 'Фото'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                      <svg v-else-if="st.direction === 'Дизайн'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                      </svg>
                      <svg v-else-if="st.direction === 'Видео'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                      <svg v-else-if="st.direction === 'Моушен'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                      </svg>
                      <svg v-else-if="st.direction === 'СММ'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                      </svg>
                      <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>
                      </svg>
                      <span>{{ st.direction }}</span>
                    </span>
                    <span
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
                      :class="getStatusBadgeClass(st.status)"
                    >
                      {{ getStatusLabel(st.status) }}
                    </span>
                  </div>

                  <div class="font-bold text-slate-800 dark:text-white text-xs mb-1 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-rose-300 transition-colors">
                    #{{ st.id }} {{ st.title }}
                  </div>
                  <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {{ st.description || 'ТЗ для отдела' }}
                  </p>
                </div>

                <!-- Footer: Assignee & Action -->
                <div class="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between mt-2">
                  <div class="flex items-center space-x-1.5 overflow-hidden">
                    <template v-if="st.assigned_to">
                      <div class="w-5 h-5 rounded-full overflow-hidden bg-orange-100 dark:bg-rose-500/20 flex-shrink-0 text-[9px] flex items-center justify-center font-bold">
                        <img v-if="st.assigned_to.avatar_url" :src="st.assigned_to.avatar_url" class="w-full h-full object-cover">
                        <span v-else class="text-orange-700 dark:text-rose-300">{{ st.assigned_to.name.charAt(0) }}</span>
                      </div>
                      <span class="text-[10px] text-slate-700 dark:text-slate-300 font-semibold truncate">
                        {{ st.assigned_to.name.split(' ')[0] }}
                      </span>
                    </template>
                    <template v-else>
                      <span class="text-[10px] text-slate-400 dark:text-slate-500 italic">Свободна</span>
                    </template>
                  </div>

                  <span class="text-[10px] font-bold text-orange-600 dark:text-rose-300 group-hover:text-orange-700 dark:group-hover:text-rose-200 flex items-center space-x-1 ml-1 flex-shrink-0">
                    <span>К задаче</span>
                    <span>→</span>
                  </span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- LIST VIEW MODE: "Все задачи" Grid with Entire Clickable Card -->
    <div v-else key="list">
      <!-- Subheader with Create Task Button -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-black/10 dark:border-white/10">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-orange-50 dark:bg-rose-500/15 border border-orange-200 dark:border-rose-400/30 flex items-center justify-center text-orange-600 dark:text-rose-300">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <path d="m9 14 2 2 4-4"/>
            </svg>
          </div>
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">
            Все задачи медиацентра
          </h2>
          <span class="text-xs text-slate-400 font-mono">({{ tasks.length }})</span>
        </div>

        <button
          v-if="canCreateTasks"
          @click="showCreateModal = true"
          class="btn-neon px-4 py-2 rounded-xl text-xs font-black text-white shadow-md flex items-center space-x-2 self-start sm:self-auto"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Создать задачу</span>
        </button>
      </div>

      <!-- Workshop Filters (Apple Animated Liquid Glass Pill Dock) -->
      <div class="mb-4 flex flex-wrap gap-2.5 items-center">
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 text-[11px] uppercase tracking-wider">Цех:</span>
        <AnimatedPills
          v-model="selectedDirection"
          :items="directionTabs"
          variant="glass"
          size="sm"
        />
      </div>

      <!-- Status Filters (Apple Animated Liquid Glass Pill Dock) -->
      <div class="mb-7 flex flex-wrap gap-2.5 items-center pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 text-[11px] uppercase tracking-wider">Статус:</span>
        <AnimatedPills
          v-model="selectedStatus"
          :items="statusTabs"
          variant="soft"
          size="sm"
        />
      </div>

      <!-- Task Cards Grid with Smooth Department & Filter Transition -->
      <transition name="dept-swap" mode="out-in">
        <div v-if="loading" key="loading" class="text-center py-20 text-slate-400 text-xs font-medium">
          <div class="animate-spin w-8 h-8 border-2 border-orange-500 dark:border-rose-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Загрузка контент-плана...
        </div>

        <div v-else-if="tasks.length === 0" key="empty" class="cyber-glass rounded-3xl p-12 text-center text-slate-400 max-w-md mx-auto">
          <div class="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-rose-500/10 border border-orange-200 dark:border-rose-500/20 flex items-center justify-center text-orange-500 dark:text-rose-400 mx-auto mb-4">
            <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
            </svg>
          </div>
          <div class="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Задач не найдено</div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            По выбранным фильтрам задачи отсутствуют.
          </p>
        </div>

        <div v-else :key="'tasks-' + selectedDirection + '-' + selectedStatus" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <TaskCard
            v-for="task in tasks"
            :key="task.id"
            :task="task"
          />
        </div>
      </transition>
    </div>
    </transition>

    <!-- Modals -->
    <CreateTaskModal
      :is-open="showCreateModal"
      :current-user="user"
      @close="showCreateModal = false"
      @created="onTaskCreated"
    />

    <MultiTaskModal
      :is-open="showMultiTaskModal"
      :edit-event="editingEvent"
      @close="closeMultiTaskModal"
      @saved="onMultiTaskSaved"
    />

    <MultiTaskDetailModal
      :is-open="showDetailModal"
      :event="selectedDetailEvent"
      :is-leader="isLeader"
      @close="showDetailModal = false"
      @edit="onEditFromDetail"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import TaskCard from '../components/TaskCard.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';
import MultiTaskModal from '../components/MultiTaskModal.vue';
import MultiTaskDetailModal from '../components/MultiTaskDetailModal.vue';
import MultiTaskCalendar from '../components/MultiTaskCalendar.vue';
import AnimatedPills from '../components/AnimatedPills.vue';

const { user, isLeader, canCreateTasks, showNotification } = useAuthStore();

const viewMode = ref('calendar'); // 'calendar' or 'list'

const modeTabs = [
  { label: 'Календарь', value: 'calendar' },
  { label: 'Все задачи', value: 'list' }
];

const directionTabs = [
  { label: 'Все', value: '' },
  { label: 'Фото', value: 'Фото' },
  { label: 'Дизайн', value: 'Дизайн' },
  { label: 'Видео', value: 'Видео' },
  { label: 'Моушен', value: 'Моушен' },
  { label: 'СММ', value: 'СММ' }
];

const statusTabs = [
  { label: 'Все', value: '' },
  { label: 'Свободные', value: 'open' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'На проверке', value: 'review' },
  { label: 'Выполненные', value: 'done' },
  { label: 'Доработка', value: 'rework' }
];

const tasks = ref([]);
const calendarEvents = ref([]);
const loading = ref(false);
const calendarLoading = ref(false);

const selectedDirection = ref('');
const selectedStatus = ref('');
const showCreateModal = ref(false);

// Multi-Task Modal State
const showMultiTaskModal = ref(false);
const editingEvent = ref(null);

// Multi-Task Detail State
const showDetailModal = ref(false);
const selectedDetailEvent = ref(null);

// Top Calendar State & Quick Jump
const calendarSelectedDate = ref(null);
const filterByDateOnly = ref(false);
const highlightedEventId = ref(null);

const onJumpToMultiTask = (ev) => {
  if (!ev) return;
  highlightedEventId.value = ev.id;

  if (ev.event_date) {
    calendarSelectedDate.value = ev.event_date.substring(0, 10);
  }

  setTimeout(() => {
    const el = document.getElementById(`multitask-${ev.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);

  setTimeout(() => {
    if (highlightedEventId.value === ev.id) {
      highlightedEventId.value = null;
    }
  }, 3200);
};

const onCreateOnDate = (dateStr) => {
  editingEvent.value = { event_date: dateStr };
  showMultiTaskModal.value = true;
};

const clearDateFilter = () => {
  calendarSelectedDate.value = null;
  filterByDateOnly.value = false;
};

const displayedCalendarEvents = computed(() => {
  if (!filterByDateOnly.value || !calendarSelectedDate.value) {
    return calendarEvents.value;
  }
  return calendarEvents.value.filter(ev => {
    const rawDate = ev.event_date || (ev.deadline ? ev.deadline.substring(0, 10) : null);
    return rawDate && rawDate.startsWith(calendarSelectedDate.value);
  });
});

const formatFilterDateTitle = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const mGenitive = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return `${day} ${mGenitive[monthIdx] || ''} ${parts[0]}`;
};

const openCreateMultiTask = () => {
  editingEvent.value = null;
  showMultiTaskModal.value = true;
};

const openEditMultiTask = (ev) => {
  editingEvent.value = ev;
  showMultiTaskModal.value = true;
};

const openDetailMultiTask = (ev) => {
  selectedDetailEvent.value = ev;
  showDetailModal.value = true;
};

const onEditFromDetail = (ev) => {
  showDetailModal.value = false;
  openEditMultiTask(ev);
};

const closeMultiTaskModal = () => {
  showMultiTaskModal.value = false;
  editingEvent.value = null;
};

const getDirColor = (dir) => {
  switch (dir) {
    case 'Фото': return 'text-amber-600 dark:text-amber-300';
    case 'Дизайн': return 'text-pink-600 dark:text-pink-400';
    case 'Видео': return 'text-red-600 dark:text-red-400';
    case 'Моушен': return 'text-sky-600 dark:text-cyan-300';
    case 'СММ': return 'text-emerald-600 dark:text-emerald-300';
    default: return 'text-orange-600 dark:text-kedrRose';
  }
};

const getWorkshopDotClass = (st) => {
  if (!st) return 'bg-slate-400 text-white';
  if (st.status === 'done') return 'bg-emerald-500 text-white';
  if (st.status === 'review') return 'bg-purple-500 text-white';
  if (st.status === 'rework') return 'bg-red-500 text-white';
  if (st.status === 'in_progress') return 'bg-amber-500 text-black';
  return 'bg-orange-500 text-white';
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'open': return 'Свободна';
    case 'in_progress': return 'В работе';
    case 'review': return 'Проверка';
    case 'done': return 'Готово';
    case 'rework': return 'Доработка';
    default: return 'Ожидание';
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'open': return 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30';
    case 'in_progress': return 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30';
    case 'review': return 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30';
    case 'done': return 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30';
    case 'rework': return 'bg-rose-50 dark:bg-red-500/20 text-rose-700 dark:text-red-300 border border-rose-200 dark:border-red-500/30';
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  }
};

const getSubtaskCardClasses = (subtask) => {
  if (!subtask) return 'bg-slate-50 dark:bg-white/5 border-black/5 dark:border-white/5 opacity-60';
  if (subtask.status === 'done') return 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30';
  if (subtask.status === 'review') return 'bg-purple-50/70 dark:bg-purple-950/25 border-purple-200 dark:border-purple-500/40';
  if (subtask.status === 'rework') return 'bg-rose-50/70 dark:bg-red-950/25 border-rose-200 dark:border-red-500/40';
  if (subtask.status === 'in_progress') return 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-500/30';
  return 'bg-white dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-orange-400 dark:hover:border-rose-400/50 shadow-xs';
};

const formatDateDay = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.split('-')[2] || dateStr;
  return d.getDate();
};

const formatDateMonth = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
  return months[d.getMonth()] || '';
};

const fetchCalendarEvents = async () => {
  calendarLoading.value = true;
  try {
    const res = await fetch('/api/tasks/calendar');
    if (res.ok) {
      const data = await res.json();
      calendarEvents.value = data.events || [];
    }
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
  } finally {
    calendarLoading.value = false;
  }
};

const fetchTasks = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (selectedDirection.value) params.append('direction', selectedDirection.value);
    if (selectedStatus.value) params.append('status', selectedStatus.value);

    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      tasks.value = data.tasks || [];
    }
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
  } finally {
    loading.value = false;
  }
};

const onTaskCreated = (newTask) => {
  showNotification('Задача успешно создана и добавлена в контент-план!');
  fetchTasks();
  fetchCalendarEvents();
};

const onMultiTaskSaved = () => {
  showNotification('Мульти-задача успешно сохранена!');
  closeMultiTaskModal();
  fetchCalendarEvents();
  fetchTasks();
};

watch([selectedDirection, selectedStatus], () => {
  fetchTasks();
});

onMounted(() => {
  fetchTasks();
  fetchCalendarEvents();
});
</script>
