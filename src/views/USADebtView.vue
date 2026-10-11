<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
    
    <!-- Top Header: Consistent with Media Management & Content Plan Views -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center space-x-3 mb-1">
          <div class="w-9 h-9 rounded-xl bg-pink-500/10 dark:bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-600 dark:text-[#fcb4d5] shadow-sm dark:shadow-lg dark:shadow-pink-950/50">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <circle cx="12" cy="11" r="3"/>
            </svg>
          </div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Гос-Долг USA & Архив Хранителей
            </h1>
            <span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-700 dark:text-[#fcb4d5] border border-pink-500/30 uppercase tracking-wider hidden sm:inline-block">
              5 уровень // Хранитель
            </span>
          </div>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Оперативный мониторинг национального долга США и закрытый реестр стратегических заметок, директив и паролей медиацентра.
        </p>
      </div>

      <!-- Quick Action Navigation Links -->
      <div class="flex items-center space-x-2.5 shrink-0">
        <router-link
          to="/content-plan"
          class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#14141c] hover:bg-orange-50/30 dark:hover:bg-[#1a1a24] text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-[#fcb4d5] border border-slate-200 dark:border-white/10 transition-all flex items-center space-x-2 shadow-xs cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span class="hidden sm:inline">Контент-план</span>
        </router-link>

        <router-link
          v-if="user && user.access_level >= 3"
          to="/management"
          class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#14141c] hover:bg-amber-50/30 dark:hover:bg-[#1a1a24] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-[#fcb4d5] border border-slate-200 dark:border-white/10 transition-all flex items-center space-x-2 shadow-xs cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span class="hidden sm:inline">Руководство</span>
        </router-link>

        <button
          @click="showCreateForm = !showCreateForm"
          class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-sm shadow-pink-500/20 flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>{{ showCreateForm ? 'Закрыть форму' : 'Создать заметку' }}</span>
        </button>
      </div>
    </div>

    <!-- 4 Stats Metric Cards: Styled identically to site's Dashboard & Management cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Metric 1: Live USA Debt -->
      <div class="cyber-glass rounded-2xl p-4.5 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#101016]/90 shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Госдолг USA (Live)
          </span>
          <div class="w-7 h-7 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-600 dark:text-[#fcb4d5]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="20" height="12" x="2" y="6" rx="2"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M6 12h.01M18 12h.01"/>
            </svg>
          </div>
        </div>
        <div class="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          ${{ formattedDebt }}
        </div>
        <div class="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
          <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
          <span>Обновление в реальном времени</span>
        </div>
      </div>

      <!-- Metric 2: Growth Speed -->
      <div class="cyber-glass rounded-2xl p-4.5 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#101016]/90 shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Прирост в секунду
          </span>
          <div class="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
        </div>
        <div class="font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
          +$102,400 / сек
        </div>
        <div class="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span>+$6,144,000 каждую минуту</span>
        </div>
      </div>

      <!-- Metric 3: Debt Per Citizen -->
      <div class="cyber-glass rounded-2xl p-4.5 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#101016]/90 shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            На каждого гражданина
          </span>
          <div class="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        </div>
        <div class="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          ${{ formattedDebtPerCitizen }}
        </div>
        <div class="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span>Население США: ~336 млн чел.</span>
        </div>
      </div>

      <!-- Metric 4: Keeper Notes Count -->
      <div class="cyber-glass rounded-2xl p-4.5 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#101016]/90 shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Заметок в архиве
          </span>
          <div class="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
        </div>
        <div class="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {{ notes.length }}
        </div>
        <div class="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
          <span>📌 {{ pinnedCount }} закреплено в топе</span>
        </div>
      </div>

    </div>

    <!-- Live Classified Terminal Widget: Guaranteed 100% Crisp White Text in All Themes -->
    <div class="usa-dark-card relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-slate-950 via-[#130616] to-[#09030b] border border-pink-500/30 shadow-2xl">
      <!-- Glow ambient background orbs -->
      <div class="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-pink-600/15 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <!-- Terminal Status Badge -->
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-[11px] font-black uppercase tracking-widest mb-3">
            <span class="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
            <span class="text-pink-200">TOP SECRET // CLASSIFIED TERMINAL // ХРАНИТЕЛИ 5 УРОВНЯ</span>
          </div>

          <h2 class="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center space-x-2.5 mb-2">
            <span>🇺🇸 Национальный Госдолг США</span>
          </h2>
          <p class="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Терминал постоянного наблюдения. Данные обновляются каждые 500 миллисекунд в соответствии с официальными темпами фискальной эмиссии казначейства США ($102,400 в секунду).
          </p>

          <!-- Terminal Extra Specs -->
          <div class="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/10 text-[11px] font-mono text-slate-300">
            <div class="flex items-center space-x-1.5">
              <span class="text-pink-400">●</span>
              <span>Отношение к ВВП: <strong>~124%</strong></span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span class="text-emerald-400">●</span>
              <span>Прирост в сутки: <strong>+$8.84 млрд</strong></span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span class="text-blue-400">●</span>
              <span>Шифрование архива: <strong>AES-256</strong></span>
            </div>
          </div>
        </div>

        <!-- Live Big Counter Box -->
        <div class="bg-black/60 backdrop-blur-xl border border-pink-500/40 rounded-2xl p-5 text-right min-w-[280px] sm:min-w-[340px] shadow-inner shrink-0">
          <div class="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-widest flex items-center justify-end space-x-1.5 mb-1.5">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>U.S. DEBT LIVE TICKER</span>
          </div>
          <div class="font-mono text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-200 to-amber-100 tracking-tight">
            ${{ formattedDebt }}
          </div>
          <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-left text-[11px] font-mono">
            <div>
              <span class="text-slate-400 block text-[9px] uppercase">На жителя:</span>
              <span class="font-bold text-white">${{ formattedDebtPerCitizen }}</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[9px] uppercase">Рост:</span>
              <span class="font-bold text-emerald-400">+$102.4k/сек</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes Management Section -->
    <div class="space-y-6">
      
      <!-- Section Header & Filter Pills -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-pink-500/15 dark:bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-600 dark:text-[#fcb4d5]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-pink-700 dark:text-[#fcb4d5] flex items-center space-x-2">
            <span>Секретные директивы и заметки</span>
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-700 dark:text-[#fcb4d5] border border-pink-500/30">
              {{ notes.length }}
            </span>
          </h2>
        </div>

        <!-- Filter Pills: Matching ManagementView styling -->
        <div class="flex flex-wrap gap-1.5 items-center">
          <button
            v-for="st in [
              { label: 'Все', value: 'all', count: notes.length },
              { label: '📌 Закрепленные', value: 'pinned', count: pinnedCount },
              { label: 'Обычные', value: 'unpinned', count: unpinnedCount },
              { label: 'Мои', value: 'mine', count: myNotesCount }
            ]"
            :key="st.value"
            @click="filterTab = st.value"
            class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center space-x-1.5"
            :class="filterTab === st.value
              ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
              : 'bg-white dark:bg-[#14141c] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-pink-300 dark:hover:border-pink-500/30'"
          >
            <span>{{ st.label }}</span>
            <span class="text-[9px] font-mono opacity-80">({{ st.count }})</span>
          </button>
        </div>
      </div>

      <!-- New Note Creator Collapsible Form -->
      <transition name="expand">
        <div
          v-if="showCreateForm"
          class="cyber-glass rounded-2xl md:rounded-3xl p-5 md:p-6 border border-pink-300/80 dark:border-pink-500/30 bg-white/90 dark:bg-[#101016]/95 shadow-xl space-y-4"
        >
          <div class="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.08] pb-3">
            <h3 class="text-xs font-black uppercase tracking-wider text-pink-700 dark:text-[#fcb4d5] flex items-center space-x-2">
              <span>📝 Новая запись в архиве Хранителей</span>
            </h3>
            <span class="text-[10px] text-slate-400 font-mono">Доступ: 👑 5 уровень (Хранитель)</span>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Заголовок / Тема заметки:
              </label>
              <input
                v-model="newNoteTitle"
                type="text"
                maxlength="120"
                placeholder="Например: План реорганизации медиацентра, пароли или стратегические ссылки..."
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070208] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 font-semibold"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Текст заметки:
                </label>
                <span class="text-[10px] text-slate-400 font-mono">{{ newNoteContent.length }} симв.</span>
              </div>
              <textarea
                v-model="newNoteContent"
                rows="4"
                placeholder="Введите текст заметки, инструкции, списки или секретные параметры..."
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070208] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 leading-relaxed font-mono"
              ></textarea>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label class="flex items-center space-x-2.5 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  v-model="newNotePinned"
                  type="checkbox"
                  class="rounded text-pink-600 focus:ring-pink-500 h-4 w-4 border-slate-300 dark:border-white/20 cursor-pointer"
                />
                <span>📌 Закрепить вверху списка</span>
              </label>

              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  @click="showCreateForm = false"
                  class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  @click="createNote"
                  :disabled="savingNote || !newNoteContent.trim()"
                  class="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-md shadow-pink-500/20 disabled:opacity-40 cursor-pointer flex items-center space-x-2 transition-all active:scale-95"
                >
                  <svg v-if="savingNote" class="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/></svg>
                  <span>{{ savingNote ? 'Сохранение...' : 'Сохранить заметку' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Search & Sorting Controls Toolbar -->
      <div class="p-3.5 rounded-2xl cyber-glass border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-[#101016]/90">
        <div class="relative flex-1">
          <svg class="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по заголовку, автору или тексту заметок..."
            class="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0c050d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            title="Очистить поиск"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0">
          <span>Найдено: <strong class="text-slate-900 dark:text-white">{{ filteredNotes.length }}</strong></span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-20 text-center text-xs text-slate-400">
        <div class="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        Загрузка секретного архива Хранителей...
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredNotes.length === 0" class="cyber-glass rounded-3xl p-12 text-center text-slate-400 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#101016]/90">
        <div class="w-12 h-12 rounded-2xl bg-pink-500/10 dark:bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-600 dark:text-[#fcb4d5] mx-auto mb-3 text-xl">
          🔐
        </div>
        <div class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
          {{ searchQuery ? 'Ничего не найдено по вашему запросу' : 'В архиве пока нет заметок' }}
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
          Нажмите кнопку «Создать заметку» выше, чтобы зафиксировать секретную директиву, важные данные или стратегические планы.
        </p>
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          Сбросить фильтр поиска
        </button>
      </div>

      <!-- Notes Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="cyber-glass-card rounded-2xl md:rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 group relative border shadow-xs hover:shadow-md"
          :class="note.is_pinned
            ? 'bg-gradient-to-b from-pink-500/[0.05] to-white/90 dark:to-[#0f0410] border-pink-400/60 dark:border-[#fcb4d5]/40 shadow-pink-500/5'
            : 'bg-white/80 dark:bg-[#0c050d] border-slate-200/90 dark:border-white/10 hover:border-pink-300 dark:hover:border-pink-500/30'"
        >
          <!-- Card Body -->
          <div>
            <!-- Card Header: Pin status & Date -->
            <div class="flex items-center justify-between gap-2 mb-3">
              <span
                v-if="note.is_pinned"
                class="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/25 text-pink-700 dark:text-[#fcb4d5] border border-pink-300 dark:border-pink-500/40 uppercase font-mono flex items-center space-x-1"
              >
                <span>📌</span>
                <span>Закреплено</span>
              </span>
              <span v-else class="text-[10px] text-slate-400 font-mono">
                #{{ note.id }}
              </span>

              <span class="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                <svg class="w-3 h-3 text-slate-400 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{{ formatDate(note.created_at) }}</span>
              </span>
            </div>

            <!-- Author Row -->
            <div class="flex items-center space-x-2.5 mb-3 pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div class="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-xs">
                <img v-if="note.author_avatar" :src="note.author_avatar" class="w-full h-full object-cover">
                <span v-else>{{ note.author_name ? note.author_name.charAt(0) : '?' }}</span>
              </div>
              <div class="min-w-0 text-[11px] truncate flex items-center space-x-1.5">
                <span class="font-bold text-slate-900 dark:text-white truncate">{{ note.author_name }}</span>
                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-pink-500/15 text-pink-700 dark:text-[#fcb4d5] font-mono">
                  👑 Хранитель
                </span>
              </div>
            </div>

            <!-- Title -->
            <h3 class="font-extrabold text-sm text-slate-900 dark:text-white mb-2 leading-snug">
              {{ note.title || 'Без названия' }}
            </h3>

            <!-- Monospace Content Block -->
            <div class="bg-slate-50/90 dark:bg-[#070208]/80 p-3.5 rounded-2xl border border-slate-200/60 dark:border-white/5 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto select-text">
              {{ note.content }}
            </div>
          </div>

          <!-- Card Actions Footer -->
          <div class="pt-3 mt-4 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs">
            <button
              @click="copyContent(note)"
              title="Скопировать текст в буфер обмена"
              class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              :class="copiedId === note.id
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'"
            >
              <svg v-if="copiedId === note.id" class="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>{{ copiedId === note.id ? 'Скопировано!' : 'Копировать' }}</span>
            </button>

            <div class="flex items-center space-x-1">
              <!-- Pin toggle button -->
              <button
                @click="togglePin(note)"
                :title="note.is_pinned ? 'Открепить заметку' : 'Закрепить заметку'"
                class="p-1.5 rounded-lg transition-all cursor-pointer"
                :class="note.is_pinned
                  ? 'text-pink-600 dark:text-[#fcb4d5] bg-pink-500/10 hover:bg-pink-500/20'
                  : 'text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10'"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="17" x2="12" y2="22"/>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a3 3 0 0 0-6 0v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"/>
                </svg>
              </button>

              <!-- Delete button -->
              <button
                @click="deleteNote(note.id)"
                title="Удалить заметку"
                class="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const { user, showNotification } = authStore;

const notes = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const filterTab = ref('all');
const showCreateForm = ref(false);
const copiedId = ref(null);

const newNoteTitle = ref('');
const newNoteContent = ref('');
const newNotePinned = ref(false);
const savingNote = ref(false);

// Real-time dynamic US National Debt simulation
const baseDebt = 36254129482109; // Baseline US National Debt in USD
const startTime = Date.now();
const currentDebt = ref(baseDebt);
let debtTimer = null;

const updateDebtTicker = () => {
  const elapsedSec = (Date.now() - startTime) / 1000;
  // US Debt grows by approx $102,400 per second
  currentDebt.value = Math.floor(baseDebt + elapsedSec * 102400);
};

const formattedDebt = computed(() => {
  return currentDebt.value.toLocaleString('en-US');
});

const formattedDebtPerCitizen = computed(() => {
  // Population approx 336 million
  const perCitizen = Math.floor(currentDebt.value / 336000000);
  return perCitizen.toLocaleString('en-US');
});

const pinnedCount = computed(() => {
  return notes.value.filter(n => n.is_pinned).length;
});

const unpinnedCount = computed(() => {
  return notes.value.filter(n => !n.is_pinned).length;
});

const myNotesCount = computed(() => {
  if (!user) return 0;
  return notes.value.filter(n => n.author_id === user.id || n.author_name === user.name).length;
});

const filteredNotes = computed(() => {
  let list = [...notes.value];

  // Apply tab filter
  if (filterTab.value === 'pinned') {
    list = list.filter(n => n.is_pinned);
  } else if (filterTab.value === 'unpinned') {
    list = list.filter(n => !n.is_pinned);
  } else if (filterTab.value === 'mine') {
    if (user) {
      list = list.filter(n => n.author_id === user.id || n.author_name === user.name);
    }
  }

  // Apply search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(n =>
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.content && n.content.toLowerCase().includes(q)) ||
      (n.author_name && n.author_name.toLowerCase().includes(q))
    );
  }

  return list;
});

const formatDate = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return ts;
  }
};

const fetchNotes = async () => {
  loading.value = true;
  try {
    const res = await fetch('/api/guardian-notes');
    if (res.ok) {
      const data = await res.json();
      notes.value = data.notes || [];
    } else if (res.status === 403) {
      showNotification('Доступ разрешен только Хранителям (5 уровень).', 'error');
    }
  } catch (e) {
    console.error('Failed to load notes:', e);
  } finally {
    loading.value = false;
  }
};

const createNote = async () => {
  if (!newNoteContent.value.trim() || savingNote.value) return;
  savingNote.value = true;
  try {
    const res = await fetch('/api/guardian-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newNoteTitle.value.trim(),
        content: newNoteContent.value.trim(),
        is_pinned: newNotePinned.value
      })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || 'Секретная заметка сохранена!');
      newNoteTitle.value = '';
      newNoteContent.value = '';
      newNotePinned.value = false;
      showCreateForm.value = false;
      await fetchNotes();
    } else {
      alert(data.error || 'Ошибка при сохранении');
    }
  } catch (e) {
    alert('Сетевая ошибка при сохранении заметки');
  } finally {
    savingNote.value = false;
  }
};

const togglePin = async (note) => {
  const newStatus = note.is_pinned ? 0 : 1;
  try {
    const res = await fetch(`/api/guardian-notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: newStatus })
    });
    if (res.ok) {
      note.is_pinned = newStatus;
      showNotification(newStatus ? 'Заметка закреплена вверху' : 'Заметка откреплена');
      await fetchNotes();
    }
  } catch (e) {
    alert('Ошибка при изменении статуса');
  }
};

const deleteNote = async (noteId) => {
  if (!confirm('Удалить эту заметку из секретного архива Хранителей?')) return;
  try {
    const res = await fetch(`/api/guardian-notes/${noteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || 'Заметка удалена');
      notes.value = notes.value.filter(n => n.id !== noteId);
    } else {
      alert(data.error || 'Ошибка при удалении');
    }
  } catch (e) {
    alert('Сетевая ошибка при удалении заметки');
  }
};

const copyContent = (note) => {
  if (!note || !note.content) return;
  navigator.clipboard.writeText(note.content).then(() => {
    copiedId.value = note.id;
    showNotification('Текст заметки скопирован в буфер обмена!');
    setTimeout(() => {
      if (copiedId.value === note.id) {
        copiedId.value = null;
      }
    }, 2000);
  }).catch(() => {
    alert('Не удалось скопировать текст');
  });
};

onMounted(() => {
  fetchNotes();
  updateDebtTicker();
  debtTimer = setInterval(updateDebtTicker, 500);
});

onUnmounted(() => {
  if (debtTimer) clearInterval(debtTimer);
});
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease-out;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
