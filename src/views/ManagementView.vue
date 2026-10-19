<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
    <!-- Header (Encased in Liquid Glass) -->
    <div class="cyber-glass rounded-3xl p-5 sm:p-7 mb-8 border border-white/80 dark:border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center space-x-3 mb-1">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-sm dark:shadow-lg dark:shadow-amber-950/50">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h1 class="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Панель руководства медиацентра
          </h1>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Сводная аналитика команды, аттестация работ (1..10), оперативное управление учетными записями и инспекция задач.
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <router-link
          to="/content-plan"
          class="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#14141c] hover:bg-orange-50/30 dark:hover:bg-[#1a1a24] text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-[#fcb4d5] border border-slate-200 dark:border-white/10 transition-all flex items-center space-x-2 shadow-xs"
        >
          <svg class="w-4 h-4 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span>Контент-план</span>
        </router-link>
      </div>
    </div>

    <!-- Review Queue Section -->
    <div class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-purple-500/15 dark:bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-600 dark:text-purple-300">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            Задачи, ожидающие проверки и оценки ({{ reviewTasks.length }})
          </h2>
        </div>
        <span v-if="reviewTasks.length > 0" class="text-[11px] font-bold text-amber-700 dark:text-amber-400 animate-pulse bg-amber-50 dark:bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-400/20">
          Требуют аттестации
        </span>
      </div>

      <div v-if="reviewTasks.length === 0" class="cyber-glass rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#101016]/90">
        В данный момент нет сданных задач на проверке. Все текущие работы проверены!
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <TaskCard
          v-for="t in reviewTasks"
          :key="t.id"
          :task="t"
        />
      </div>
    </div>

    <!-- Team Ideas Section («💡 Банк идей от команды») -->
    <div class="mb-10">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-pink-500/20 border border-amber-400/30 dark:border-pink-500/30 flex items-center justify-center text-amber-600 dark:text-[#fcb4d5]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v1"/><path d="M12 21v1"/><path d="M4.93 4.93l.7.7"/><path d="M18.36 18.36l.7.7"/><path d="M2 12h1"/><path d="M21 12h1"/><path d="M4.93 19.07l.7-.7"/><path d="M18.36 5.64l.7-.7"/>
              <circle cx="12" cy="12" r="5"/>
            </svg>
          </div>
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-amber-700 dark:text-[#fcb4d5] flex items-center space-x-2">
            <span>Банк идей от команды</span>
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 dark:bg-pink-500/20 text-amber-700 dark:text-[#fcb4d5] border border-amber-500/30 dark:border-pink-500/30">
              {{ teamIdeas.length }}
            </span>
          </h2>
        </div>

        <!-- Status Filter Pills -->
        <div class="flex flex-wrap gap-1.5 items-center">
          <button
            v-for="st in [
              { label: 'Все', value: '' },
              { label: 'Новые', value: 'new' },
              { label: 'На рассмотрении', value: 'in_review' },
              { label: 'Одобрено', value: 'approved' },
              { label: 'Реализовано', value: 'implemented' },
              { label: 'Отклонено', value: 'rejected' }
            ]"
            :key="st.value"
            @click="ideaStatusFilter = st.value"
            class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer"
            :class="ideaStatusFilter === st.value
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-orange-500 shadow-xs dark:bg-none dark:bg-[#FCB4D5] dark:text-[#0F0F14] dark:border-[#FCB4D5] dark:shadow-sm dark:shadow-pink-500/30'
              : 'bg-white dark:bg-[#14141c] text-slate-700 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-amber-500 dark:hover:border-[#fcb4d5]/50 dark:hover:text-[#fcb4d5]'"
          >
            {{ st.label }}
          </button>
        </div>
      </div>

      <div v-if="filteredTeamIdeas.length === 0" class="cyber-glass rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#101016]/90">
        {{ ideaStatusFilter ? 'Нет предложений с выбранным статусом.' : 'В банке идей пока нет предложений от команды.' }}
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="idea in filteredTeamIdeas"
          :key="idea.id"
          class="cyber-glass-card rounded-2xl p-5 flex flex-col justify-between bg-white dark:bg-[#14141c] border border-slate-200 dark:border-white/10 hover:border-amber-500/50 dark:hover:border-[#fcb4d5]/50 transition-all shadow-xs"
        >
          <div>
            <!-- Header: Status + Date -->
            <div class="flex items-center justify-between gap-2 mb-3">
              <span
                class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase font-mono"
                :class="getIdeaStatusBadgeClass(idea.status)"
              >
                {{ getIdeaStatusLabel(idea.status) }}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">
                {{ formatIdeaDate(idea.created_at) }}
              </span>
            </div>

            <!-- Author Info -->
            <div class="flex items-center space-x-2.5 mb-3 pb-3 border-b border-slate-100 dark:border-white/5">
              <div class="w-7 h-7 rounded-full overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 flex items-center justify-center font-bold text-xs text-orange-700 dark:text-[#fcb4d5] shrink-0">
                <img v-if="idea.author_avatar" :src="idea.author_avatar" class="w-full h-full object-cover">
                <span v-else>{{ idea.author_name ? idea.author_name.charAt(0) : '?' }}</span>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {{ idea.author_name }}
                </div>
                <div class="text-[10px] text-slate-400 truncate">
                  {{ idea.author_role }} • {{ idea.author_level }} ур.
                </div>
              </div>
            </div>

            <!-- Title & Description -->
            <h3 class="font-extrabold text-sm text-slate-900 dark:text-white mb-1.5 line-clamp-1">
              {{ idea.title }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
              {{ idea.description }}
            </p>
          </div>

          <!-- Footer: Chat Count & Action Button -->
          <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
            <span class="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
              <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>{{ idea.comments_count || 1 }} сообщ.</span>
            </span>

            <div class="flex items-center space-x-1.5">
              <button
                v-if="authStore.user?.access_level >= 4"
                @click.stop="quickDeleteIdea(idea.id)"
                title="Удалить предложение (Уровни 4–5)"
                class="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30 transition-all cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                </svg>
              </button>

              <button
                @click="openTeamIdeaChat(idea.id)"
                class="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span>Диалог / Ответить</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Team Members Table & Click Inspector -->
    <div>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-[#fcb4d5]/15 border border-orange-500/20 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-orange-700 dark:text-[#fcb4d5]">
            Реестр команды и мониторинг загрузки ({{ users.length }})
          </h2>
        </div>
        <div class="text-[11px] text-slate-600 dark:text-slate-300 bg-orange-50/80 dark:bg-[#fcb4d5]/10 px-3 py-1 rounded-xl border border-orange-200 dark:border-[#fcb4d5]/20 flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span><span class="text-orange-600 dark:text-[#fcb4d5] font-semibold">Нажмите на строчку</span> для просмотра задач и смены логина/пароля</span>
        </div>
      </div>

      <!-- Search, Filter & Sorting Controls (Requirement 6) -->
      <div class="mb-4 p-3.5 rounded-2xl cyber-glass border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <!-- Search Input -->
        <div class="relative flex-1">
          <svg class="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Быстрый поиск по имени или @логину..."
            class="w-full text-xs pl-8 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08080C] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#0E0E14] transition-colors"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Role Filter & Sort Dropdown -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Workshop / Role Filter -->
          <select
            v-model="selectedRole"
            class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08080C] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#0E0E14]"
          >
            <option value="Все">Все цехи</option>
            <option value="Фото">Фото</option>
            <option value="Дизайн">Дизайн</option>
            <option value="Видео">Видео</option>
            <option value="Моушен">Моушен</option>
            <option value="СММ">СММ</option>
            <option value="Руководство">Руководство</option>
          </select>

          <!-- Sort Selector -->
          <select
            v-model="sortBy"
            class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08080C] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#0E0E14] font-medium"
          >
            <option value="level_desc">Уровень доступа (сначала высший)</option>
            <option value="default">По рейтингу (баллы и активность)</option>
            <option value="name_asc">Имя: А → Я</option>
            <option value="name_desc">Имя: Я → А</option>
            <option value="active_desc">Задач в работе (сначала больше)</option>
            <option value="completed_desc">Сдано задач (по убыванию)</option>
            <option value="score_desc">Средний балл (по убыванию)</option>
          </select>

          <!-- Count Badge -->
          <span class="text-[11px] font-mono text-orange-700 dark:text-[#fcb4d5] bg-orange-50 dark:bg-[#fcb4d5]/15 px-2.5 py-1.5 rounded-xl border border-orange-200 dark:border-[#fcb4d5]/30 whitespace-nowrap">
            Найдено: <b>{{ filteredAndSortedUsers.length }}</b> / {{ users.length }}
          </span>
        </div>
      </div>

      <!-- Desktop & Tablet Table -->
      <div class="cyber-glass rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th class="py-3.5 px-4">Сотрудник</th>
                <th class="py-3.5 px-4">Цех</th>
                <th class="py-3.5 px-4 text-center">Уровень</th>
                <th class="py-3.5 px-4 text-center">В работе</th>
                <th class="py-3.5 px-4 text-center">Сдано</th>
                <th class="py-3.5 px-4 text-center">Средний балл</th>
                <th class="py-3.5 px-4 text-right">Инспекция</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-white/5">
              <tr v-if="filteredAndSortedUsers.length === 0">
                <td colspan="7" class="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  Участники по заданным критериям не найдены. Попробуйте изменить поисковый запрос или фильтр цеха.
                </td>
              </tr>
              <tr
                v-for="u in filteredAndSortedUsers"
                :key="u.id"
                @click="inspectUser(u)"
                class="hover:bg-orange-50/60 dark:hover:bg-[#fcb4d5]/10 cursor-pointer transition-all duration-150 group"
                :class="selectedUser?.id === u.id ? 'bg-orange-50 dark:bg-[#fcb4d5]/15 ring-1 ring-inset ring-orange-400 dark:ring-[#fcb4d5]' : ''"
              >
                <td class="py-3.5 px-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-9 h-9 rounded-full overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center font-bold text-xs flex-shrink-0 text-orange-700 dark:text-[#fcb4d5] group-hover:border-orange-500 dark:group-hover:border-[#fcb4d5] transition-colors">
                      <img v-if="u.avatar_url" :src="u.avatar_url" class="w-full h-full object-cover">
                      <span v-else class="text-white">{{ u.name.charAt(0) }}</span>
                    </div>
                    <div>
                      <div class="font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-[#fcb4d5] transition-colors flex items-center space-x-1.5">
                        <span>{{ u.name }}</span>
                        <span v-if="u.is_online" class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" title="В сети"></span>
                      </div>
                      <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">@{{ u.username }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span class="font-bold text-slate-700 dark:text-slate-200">{{ u.role }}</span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span
                    class="text-[10px] font-black px-2.5 py-0.5 rounded-full border font-mono"
                    :class="getLevelBadgeClass(u.access_level)"
                  >
                    {{ u.access_level }} ур.
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span :class="u.active_tasks_count > 0 ? 'text-amber-600 dark:text-amber-300 font-black' : 'text-slate-400'">
                    {{ u.active_tasks_count }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                  {{ u.completed_tasks }}
                </td>
                <td class="py-3.5 px-4 text-center font-black text-orange-600 dark:text-[#fcb4d5]">
                  {{ u.average_score }} <span class="text-[10px] text-slate-500">/ 10</span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <span class="text-xs font-semibold text-orange-500 dark:text-[#fcb4d5] group-hover:text-orange-600 dark:group-hover:text-white transition-colors flex items-center justify-end space-x-1">
                    <span>Открыть</span>
                    <span>→</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- User Inspection Modal / Slide-over Drawer -->
    <div
      v-if="selectedUser"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
      @click.self="closeInspector"
    >
      <div class="cyber-glass max-w-4xl w-full max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 dark:border-[#fcb4d5]/30 shadow-2xl overflow-hidden bg-white dark:bg-[#0A0A0E] animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Modal Top Bar -->
        <div class="px-6 py-4 bg-slate-50 dark:bg-[#121218] border-b border-slate-200 dark:border-[#fcb4d5]/20 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center space-x-3.5">
            <div
              class="w-12 h-12 rounded-2xl overflow-hidden bg-orange-500/20 dark:bg-[#fcb4d5]/20 border border-orange-500/30 dark:border-[#fcb4d5]/40 flex items-center justify-center font-black text-sm relative group cursor-pointer shadow-lg"
              @click="triggerAvatarUpload"
              title="Нажмите для загрузки нового аватара сотрудника"
            >
              <img v-if="selectedUser.avatar_url" :src="selectedUser.avatar_url" class="w-full h-full object-cover">
              <span v-else class="text-white">{{ selectedUser.name.charAt(0) }}</span>
              <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[9px] text-orange-400 dark:text-[#fcb4d5] font-bold">
                <svg class="w-3.5 h-3.5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Сменить</span>
              </div>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-base font-black text-slate-900 dark:text-white">{{ selectedUser.name }}</h3>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-md" :class="getLevelBadgeClass(selectedUser.access_level)">
                  {{ selectedUser.access_level }} уровень
                </span>
                <span v-if="selectedUser.is_online" class="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Онлайн
                </span>
              </div>
              <div class="text-xs text-slate-400">
                Цех: <span class="text-orange-600 dark:text-[#fcb4d5] font-semibold">{{ selectedUser.role }}</span> • <span class="font-mono">@{{ selectedUser.username }}</span>
              </div>
            </div>
          </div>

          <button
            @click="closeInspector"
            class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Tab Selection Header -->
        <div class="px-6 bg-slate-100/60 dark:bg-[#14141A] border-b border-slate-200 dark:border-white/10 flex space-x-6 text-xs font-bold flex-shrink-0">
          <button
            @click="activeTab = 'tasks'"
            class="py-3 border-b-2 transition-all flex items-center space-x-2"
            :class="activeTab === 'tasks' ? 'border-orange-500 dark:border-[#fcb4d5] text-orange-600 dark:text-[#fcb4d5]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <span>Задачи сотрудника</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-[#fcb4d5]/20 text-orange-700 dark:text-[#fcb4d5] ml-1">
              {{ inspectorTasks.length }}
            </span>
          </button>
          
          <button
            @click="activeTab = 'edit'"
            class="py-3 border-b-2 transition-all flex items-center space-x-2"
            :class="activeTab === 'edit' ? 'border-orange-500 dark:border-[#fcb4d5] text-orange-600 dark:text-[#fcb4d5]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
            </svg>
            <span>Редактирование профиля & Пароль</span>
          </button>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="p-6 overflow-y-auto flex-1 space-y-6">

          <!-- Alert message -->
          <div v-if="feedbackMsg" class="p-3.5 rounded-xl text-xs font-bold flex items-center justify-between" :class="feedbackIsError ? 'bg-red-500/20 border border-red-500/30 text-red-300' : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'">
            <span>{{ feedbackMsg }}</span>
            <button @click="feedbackMsg = ''" class="text-xs hover:opacity-75 p-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- TAB 1: USER TASKS INSPECTOR -->
          <div v-if="activeTab === 'tasks'" class="space-y-6">
            
            <!-- Quick Summary KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-white/10 text-center">
                <div class="text-lg font-black text-amber-600 dark:text-amber-300">{{ activeTasksCount }}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">В работе</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-white/10 text-center">
                <div class="text-lg font-black text-purple-600 dark:text-purple-300">{{ reviewTasksCount }}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">На проверке</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-white/10 text-center">
                <div class="text-lg font-black text-emerald-600 dark:text-emerald-300">{{ doneTasksCount }}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Выполнено</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-white/10 text-center">
                <div class="text-lg font-black text-orange-600 dark:text-[#fcb4d5]">{{ selectedUser.average_score }} <span class="text-xs text-slate-500">/10</span></div>
                <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Средний балл</div>
              </div>
            </div>

            <!-- Loading indicator -->
            <div v-if="loadingTasks" class="text-center py-10 text-xs text-slate-400">
              Загрузка задач сотрудника...
            </div>

            <!-- Empty Tasks -->
            <div v-else-if="inspectorTasks.length === 0" class="p-8 text-center rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs">
              У этого сотрудника пока нет назначенных или завершенных задач.
              <div class="mt-4">
                <router-link
                  :to="`/profile/${selectedUser.id}`"
                  class="btn-neon text-xs px-4 py-2 rounded-xl text-white dark:text-[#121217] font-bold inline-flex items-center space-x-1.5"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span>Выдать задачу принудительно</span>
                </router-link>
              </div>
            </div>

            <!-- Tasks Groups -->
            <div v-else class="space-y-5">
              
              <!-- 1. In Progress & Rework -->
              <div v-if="groupedTasks.in_progress.length > 0">
                <h4 class="text-xs font-black uppercase tracking-wider text-amber-300 mb-2.5 flex items-center space-x-1.5">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span>В процессе выполнения / На доработке ({{ groupedTasks.in_progress.length }})</span>
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="t in groupedTasks.in_progress"
                    :key="t.id"
                    class="p-3.5 rounded-xl bg-white dark:bg-[#080B1E] border border-slate-200 dark:border-amber-500/30 flex items-center justify-between hover:border-amber-400 transition-colors shadow-xs"
                  >
                    <div>
                      <div class="font-bold text-white text-xs flex items-center space-x-2">
                        <span>{{ t.title }}</span>
                        <span v-if="t.status === 'rework'" class="text-[9px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                          Доработка
                        </span>
                      </div>
                      <div class="text-[11px] text-slate-400 mt-1 flex items-center space-x-3">
                        <span>Цех: <b class="text-slate-300">{{ t.direction }}</b></span>
                        <span v-if="t.deadline">Дедлайн: <b class="text-amber-400">{{ t.deadline }}</b></span>
                        <span v-if="t.comments_count" class="flex items-center space-x-1">
                          <svg class="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          <span>{{ t.comments_count }}</span>
                        </span>
                      </div>
                    </div>
                    <router-link
                      :to="`/tasks/${t.id}`"
                      class="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors flex-shrink-0 ml-3"
                    >
                      К задаче →
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- 2. Review Queue -->
              <div v-if="groupedTasks.review.length > 0">
                <h4 class="text-xs font-black uppercase tracking-wider text-purple-300 mb-2.5 flex items-center space-x-1.5">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>На проверке у руководства ({{ groupedTasks.review.length }})</span>
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="t in groupedTasks.review"
                    :key="t.id"
                    class="p-3.5 rounded-xl bg-white dark:bg-[#080B1E] border border-slate-200 dark:border-purple-500/30 flex items-center justify-between hover:border-purple-400 transition-colors shadow-xs"
                  >
                    <div>
                      <div class="font-bold text-white text-xs">{{ t.title }}</div>
                      <div class="text-[11px] text-slate-400 mt-1 flex items-center space-x-3">
                        <span>Цех: <b class="text-slate-300">{{ t.direction }}</b></span>
                        <span v-if="t.result_url" class="text-cyan-400 font-mono flex items-center space-x-1">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          <span>Материалы сданы</span>
                        </span>
                      </div>
                    </div>
                    <router-link
                      :to="`/tasks/${t.id}`"
                      class="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-colors flex-shrink-0 ml-3"
                    >
                      Оценить работу →
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- 3. Done & Graded -->
              <div v-if="groupedTasks.done.length > 0">
                <h4 class="text-xs font-black uppercase tracking-wider text-emerald-300 mb-2.5 flex items-center space-x-1.5">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
                  </svg>
                  <span>Завершено и оценено ({{ groupedTasks.done.length }})</span>
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="t in groupedTasks.done"
                    :key="t.id"
                    class="p-3.5 rounded-xl bg-white dark:bg-[#080B1E] border border-slate-200 dark:border-emerald-500/20 flex items-center justify-between hover:border-emerald-400 transition-colors shadow-xs"
                  >
                    <div>
                      <div class="font-bold text-white text-xs">{{ t.title }}</div>
                      <div class="text-[11px] text-slate-400 mt-1 flex items-center space-x-3">
                        <span>Оценка: <b class="text-emerald-400 text-xs">{{ t.score }} / 10</b></span>
                        <span v-if="t.graded_by">Проверил: {{ t.graded_by.name }}</span>
                      </div>
                    </div>
                    <router-link
                      :to="`/tasks/${t.id}`"
                      class="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors flex-shrink-0 ml-3"
                    >
                      Просмотр →
                    </router-link>
                  </div>
                </div>
              </div>

            </div>

            <!-- Profile Actions Footer -->
            <div class="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <router-link
                :to="`/profile/${selectedUser.id}`"
                class="text-xs font-bold text-orange-600 dark:text-[#fcb4d5] hover:underline flex items-center space-x-1"
              >
                <span>Перейти в полный профиль сотрудника</span>
                <span>→</span>
              </router-link>
            </div>
          </div>

          <!-- TAB 2: EDIT PROFILE & CREDENTIALS -->
          <div v-if="activeTab === 'edit'" class="space-y-5">
            <div class="p-3.5 rounded-2xl bg-orange-50/80 dark:bg-[#fcb4d5]/10 border border-orange-200 dark:border-[#fcb4d5]/20 text-xs text-slate-700 dark:text-slate-200 leading-relaxed flex items-start space-x-2.5">
              <div class="w-5 h-5 rounded-lg bg-orange-500/15 dark:bg-[#fcb4d5]/20 border border-orange-500/30 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5] flex-shrink-0 mt-0.5">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-1.5 1.5L12 11l4 4 5.5-5.5a2.12 2.12 0 0 0 0-3L20 5l-1.5-1.5Z"/><path d="M15 5 9 11l-4 4-2 6 6-2 4-4 6-6"/></svg>
              </div>
              <div>
                <span class="font-bold text-slate-900 dark:text-white">Редактирование учетной записи: </span>
                Здесь вы можете оперативно изменить логин, задать новый пароль сотруднику при утере доступа, скорректировать ФИО, направление (цех) или уровень доступа.
              </div>
            </div>

            <!-- Avatar Upload Section (Requirement 9) -->
            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121218] border border-slate-200 dark:border-[#fcb4d5]/20 flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center font-bold text-sm">
                  <img v-if="selectedUser.avatar_url" :src="selectedUser.avatar_url" class="w-full h-full object-cover">
                  <span v-else class="text-orange-700 dark:text-white">{{ selectedUser.name.charAt(0) }}</span>
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white">Аватар сотрудника</div>
                  <div class="text-[10px] text-slate-400">Форматы JPG, PNG, WEBP (до 5 МБ)</div>
                </div>
              </div>
              <div>
                <input type="file" ref="avatarInputRef" accept="image/*" class="hidden" @change="uploadUserAvatar" />
                <button
                  type="button"
                  @click="triggerAvatarUpload"
                  :disabled="uploadingAvatar"
                  class="px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-50 dark:bg-[#fcb4d5]/15 hover:bg-orange-100 dark:hover:bg-[#fcb4d5]/25 text-orange-600 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30 transition-all flex items-center space-x-1.5 disabled:opacity-40"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>{{ uploadingAvatar ? 'Загрузка...' : 'Загрузить аватар' }}</span>
                </button>
              </div>
            </div>

            <form @submit.prevent="saveUserChanges" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <!-- Full Name -->
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">ФИО / Отображаемое имя:</label>
                  <input
                    v-model="editForm.name"
                    type="text"
                    required
                    class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218]"
                  />
                </div>

                <!-- Username / Login -->
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Логин в системе:</label>
                  <input
                    v-model="editForm.username"
                    type="text"
                    required
                    :disabled="selectedUser.username === 'admin'"
                    class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218] disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                  />
                  <span v-if="selectedUser.username === 'admin'" class="text-[10px] text-pink-600 dark:text-[#fcb4d5] mt-1 block font-bold">
                    Системный root-логин 'admin' (Хранитель) защищен от изменения
                  </span>
                </div>

                <!-- New Password -->
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Новый пароль:
                    <span v-if="!(selectedUser.access_level >= 5 && authStore.user?.id !== selectedUser.id)" class="text-[10px] text-slate-400 lowercase font-normal">(оставьте пустым, если не меняете)</span>
                  </label>
                  <div v-if="selectedUser.access_level >= 5 && authStore.user?.id !== selectedUser.id" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center space-x-2">
                    <svg class="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>🔒 Пароль пользователя 5 уровня (Хранитель) защищен. Изменить его может только сам владелец аккаунта.</span>
                  </div>
                  <div v-else class="relative">
                    <input
                      v-model="editForm.password"
                      type="text"
                      placeholder="•••••••• или новый пароль"
                      class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218] font-mono"
                    />
                    <button
                      type="button"
                      @click="editForm.password = generateRandomPassword()"
                      class="absolute right-2.5 top-2 text-[10px] font-bold text-orange-600 dark:text-[#fcb4d5] bg-orange-50 dark:bg-[#fcb4d5]/15 px-2 py-0.5 rounded border border-orange-200 dark:border-[#fcb4d5]/30"
                    >
                      Сгенерировать
                    </button>
                  </div>
                </div>

                <!-- Workshop / Direction -->
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Цех (Направление):</label>
                  <select
                    v-model="editForm.role"
                    :disabled="selectedUser.access_level >= 5 && authStore.user?.id !== selectedUser.id"
                    class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218] disabled:opacity-40"
                  >
                    <option value="Фото">Фото</option>
                    <option value="Дизайн">Дизайн</option>
                    <option value="Видео">Видео</option>
                    <option value="Моушен">Моушен</option>
                    <option value="СММ">СММ</option>
                    <option value="Руководство">Руководство</option>
                    <option value="Хранитель">Хранитель</option>
                  </select>
                </div>

                <!-- Access Level -->
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Уровень доступа (1..5):</label>
                  <select
                    v-model.number="editForm.access_level"
                    :disabled="selectedUser.access_level >= 5 || selectedUser.username === 'admin'"
                    class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218] disabled:opacity-40"
                  >
                    <option :value="1">1 уровень — Участник направления</option>
                    <option :value="2">2 уровень — Глава цеха</option>
                    <option :value="3">3 уровень — Руководство медиацентра</option>
                    <option :value="4">4 уровень — Главный администратор</option>
                    <option :value="5">5 уровень — Хранитель (Pink Crown)</option>
                  </select>
                </div>

                <!-- Can create tasks flag -->
                <div class="flex items-center space-x-3 pt-6">
                  <input
                    id="canCreateCheck"
                    v-model="editForm.can_create_tasks"
                    type="checkbox"
                    class="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-[#0A0A0D] text-orange-500 dark:text-[#fcb4d5] focus:ring-orange-500 dark:focus:ring-[#fcb4d5] focus:ring-offset-0"
                  />
                  <label for="canCreateCheck" class="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    Разрешить создавать задачи для 1-го уровня
                  </label>
                </div>

              </div>

              <!-- Submit Buttons -->
              <div class="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  @click="activeTab = 'tasks'"
                  class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  :disabled="savingUser"
                  class="btn-neon px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-xl flex items-center space-x-2 disabled:opacity-50"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  <span>{{ savingUser ? 'Сохранение...' : 'Сохранить изменения профиля' }}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>

    <!-- Idea Discussion Mini-Chat Modal -->
    <IdeaChatModal
      :is-open="showIdeaChatModal"
      :idea-id="activeIdeaId"
      @close="showIdeaChatModal = false"
      @status-updated="fetchTeamIdeas"
      @deleted="onIdeaDeleted"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import TaskCard from '../components/TaskCard.vue';
import IdeaChatModal from '../components/IdeaChatModal.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const users = ref([]);
const reviewTasks = ref([]);

// Team Ideas state
const teamIdeas = ref([]);
const ideaStatusFilter = ref('');
const showIdeaChatModal = ref(false);
const activeIdeaId = ref(null);

const onIdeaDeleted = (deletedId) => {
  teamIdeas.value = teamIdeas.value.filter(i => i.id !== deletedId);
};

const quickDeleteIdea = async (id) => {
  if (!confirm('Вы уверены, что хотите удалить это предложение и весь чат обсуждения?')) return;
  try {
    const res = await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      authStore.showNotification(data.message || 'Предложение удалено.');
      onIdeaDeleted(id);
    } else {
      alert(data.error || 'Ошибка удаления предложения');
    }
  } catch (e) {
    alert('Сетевая ошибка при удалении предложения');
  }
};

const filteredTeamIdeas = computed(() => {
  if (!ideaStatusFilter.value) return teamIdeas.value;
  return teamIdeas.value.filter(i => i.status === ideaStatusFilter.value);
});

const fetchTeamIdeas = async () => {
  try {
    const res = await fetch('/api/ideas');
    if (res.ok) {
      const data = await res.json();
      teamIdeas.value = data.ideas || [];
    }
  } catch (e) {
    console.error('Failed to load team ideas:', e);
  }
};

const openTeamIdeaChat = (id) => {
  activeIdeaId.value = id;
  showIdeaChatModal.value = true;
};

const getIdeaStatusLabel = (status) => {
  const map = {
    new: 'Новая',
    in_review: 'На рассмотрении',
    approved: 'Одобрено',
    implemented: 'Реализовано',
    rejected: 'Отклонено'
  };
  return map[status] || status;
};

const getIdeaStatusBadgeClass = (status) => {
  const map = {
    new: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
    in_review: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
    approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    implemented: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
    rejected: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
  };
  return map[status] || 'bg-slate-100 dark:bg-white/5 text-slate-600 border-slate-200';
};

const formatIdeaDate = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return '';
  }
};

// Search and Sorting (Requirement 6)
const searchQuery = ref('');
const selectedRole = ref('Все');
const sortBy = ref('level_desc');

const filteredAndSortedUsers = computed(() => {
  let list = [...users.value];

  // 1. Filter by role
  if (selectedRole.value && selectedRole.value !== 'Все') {
    list = list.filter(u => u.role === selectedRole.value);
  }

  // 2. Filter by search query (name or username)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  }

  // 3. Sort
  list.sort((a, b) => {
    switch (sortBy.value) {
      case 'level_desc':
        if ((b.access_level || 0) !== (a.access_level || 0)) {
          return (b.access_level || 0) - (a.access_level || 0);
        }
        if ((b.average_score || 0) !== (a.average_score || 0)) {
          return (b.average_score || 0) - (a.average_score || 0);
        }
        return (b.completed_tasks || 0) - (a.completed_tasks || 0);
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '', 'ru');
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '', 'ru');
      case 'active_desc':
        return (b.active_tasks_count || 0) - (a.active_tasks_count || 0);
      case 'completed_desc':
        return (b.completed_tasks || 0) - (a.completed_tasks || 0);
      case 'score_desc':
        return (b.average_score || 0) - (a.average_score || 0);
      case 'default':
      default:
        if ((b.average_score || 0) !== (a.average_score || 0)) {
          return (b.average_score || 0) - (a.average_score || 0);
        }
        return (b.completed_tasks || 0) - (a.completed_tasks || 0);
    }
  });

  return list;
});

// Selected user & inspector state
const selectedUser = ref(null);
const activeTab = ref('tasks');
const inspectorTasks = ref([]);
const loadingTasks = ref(false);
const savingUser = ref(false);
const feedbackMsg = ref('');
const feedbackIsError = ref(false);

// Avatar upload state (Requirement 9)
const avatarInputRef = ref(null);
const uploadingAvatar = ref(false);

const triggerAvatarUpload = () => {
  if (avatarInputRef.value) {
    avatarInputRef.value.click();
  }
};

const uploadUserAvatar = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !selectedUser.value) return;
  uploadingAvatar.value = true;
  feedbackMsg.value = '';
  feedbackIsError.value = false;

  try {
    const formData = new FormData();
    formData.append('avatar_file', file);
    const res = await fetch(`/api/users/${selectedUser.value.id}/avatar`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка при загрузке аватара');

    selectedUser.value.avatar_url = data.avatar_url;
    const idx = users.value.findIndex(u => u.id === selectedUser.value.id);
    if (idx !== -1) {
      users.value[idx].avatar_url = data.avatar_url;
    }
    if (authStore.user?.id === selectedUser.value.id) {
      authStore.user.avatar_url = data.avatar_url;
    }
    feedbackMsg.value = 'Аватар пользователя успешно обновлен!';
    feedbackIsError.value = false;
  } catch (err) {
    feedbackMsg.value = err.message;
    feedbackIsError.value = true;
  } finally {
    uploadingAvatar.value = false;
    if (avatarInputRef.value) avatarInputRef.value.value = '';
  }
};

const editForm = ref({
  name: '',
  username: '',
  password: '',
  role: 'Фото',
  access_level: 1,
  can_create_tasks: false
});

const getLevelBadgeClass = (lvl) => {
  if (lvl >= 5) return 'bg-pink-100 dark:bg-pink-500/25 text-pink-700 dark:text-[#fcb4d5] border-pink-300 dark:border-[#fcb4d5]/40 shadow-xs';
  if (lvl >= 4) return 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30';
  if (lvl === 3) return 'bg-orange-500/15 text-orange-600 dark:text-[#fcb4d5] border-orange-500/30 dark:border-[#fcb4d5]/30';
  if (lvl === 2) return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30';
  return 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10';
};

const generateRandomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
};

const groupedTasks = computed(() => {
  return {
    in_progress: inspectorTasks.value.filter(t => t.status === 'in_progress' || t.status === 'rework'),
    review: inspectorTasks.value.filter(t => t.status === 'review'),
    done: inspectorTasks.value.filter(t => t.status === 'done')
  };
});

const activeTasksCount = computed(() => groupedTasks.value.in_progress.length);
const reviewTasksCount = computed(() => groupedTasks.value.review.length);
const doneTasksCount = computed(() => groupedTasks.value.done.length);

const inspectUser = async (u) => {
  selectedUser.value = u;
  activeTab.value = 'tasks';
  feedbackMsg.value = '';
  
  // Populate edit form
  editForm.value = {
    name: u.name,
    username: u.username,
    password: '',
    role: u.role,
    access_level: u.access_level,
    can_create_tasks: Boolean(u.can_create_tasks)
  };

  // Fetch their tasks
  loadingTasks.value = true;
  inspectorTasks.value = [];
  try {
    const res = await fetch(`/api/users/${u.id}`);
    if (res.ok) {
      const data = await res.json();
      inspectorTasks.value = data.tasks || [];
    }
  } catch (err) {
    console.error('Failed to load user tasks:', err);
  } finally {
    loadingTasks.value = false;
  }
};

const closeInspector = () => {
  selectedUser.value = null;
  feedbackMsg.value = '';
};

const saveUserChanges = async () => {
  if (!selectedUser.value) return;
  savingUser.value = true;
  feedbackMsg.value = '';
  feedbackIsError.value = false;

  try {
    const body = {
      name: editForm.value.name,
      username: editForm.value.username,
      role: editForm.value.role,
      access_level: editForm.value.access_level,
      can_create_tasks: editForm.value.can_create_tasks
    };
    if (editForm.value.password) {
      body.password = editForm.value.password;
    }

    const res = await fetch(`/api/users/${selectedUser.value.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка при сохранении данных');
    }

    feedbackMsg.value = data.message || 'Профиль успешно обновлен!';
    feedbackIsError.value = false;

    // Update in selectedUser and users table
    if (data.user) {
      selectedUser.value = { ...selectedUser.value, ...data.user };
      const idx = users.value.findIndex(u => u.id === selectedUser.value.id);
      if (idx !== -1) {
        users.value[idx] = { ...users.value[idx], ...data.user };
      }
    }
    editForm.value.password = '';
  } catch (err) {
    feedbackMsg.value = err.message;
    feedbackIsError.value = true;
  } finally {
    savingUser.value = false;
  }
};

const fetchData = async () => {
  try {
    const [usersRes, tasksRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/tasks?status=review')
    ]);
    if (usersRes.ok) users.value = await usersRes.json();
    if (tasksRes.ok) {
      const data = await tasksRes.json();
      reviewTasks.value = data.tasks || [];
    }
    await fetchTeamIdeas();
  } catch (e) {
    console.error('Failed to load management data:', e);
  }
};

onMounted(() => {
  fetchData();
});
</script>
