<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
    <!-- Top Header: Open, Breathable Typography -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 md:mb-14">
      <div>
        <div class="flex items-center space-x-3 mb-1.5">
          <div class="w-10 h-10 rounded-2xl bg-red-500/10 dark:bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-600 dark:text-red-300 shadow-xs">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Панель Администрации и Хранителя (Уровни 4–5)
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          Модерация заявок на регистрацию, управление уровнями доступа (1..5), правами создания задач и шлюзами ботов
        </p>
      </div>

      <router-link
        to="/content-plan"
        class="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#14141c] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 self-start md:self-auto flex items-center space-x-2 transition-colors shadow-xs cursor-pointer"
      >
        <span>← В контент-план</span>
      </router-link>
    </header>

    <!-- TELEGRAM BOT CONFIGURATION CARD -->
    <div class="mb-10 cyber-glass rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-xs relative overflow-hidden bg-white dark:bg-[#0D0E12]">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
        <div class="flex items-center space-x-3.5">
          <div class="w-11 h-11 rounded-2xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 border border-[#0088cc]/25 flex items-center justify-center text-[#0088cc] flex-shrink-0 shadow-xs">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center space-x-2.5">
              <h2 class="text-base font-bold text-slate-900 dark:text-white">
                Интеграция с Telegram-ботом руководства
              </h2>
              <span
                class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5"
                :class="tgConfig.is_active ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600/30'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="tgConfig.is_active ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-400'"></span>
                <span>{{ tgConfig.is_active ? 'Бот активен' : 'Требуется токен' }}</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Позволяет руководству (L3-L4) удаленно проверять работы, выставлять баллы (1..10) через inline-кнопки и запрашивать сводную статистику команды (/stats).
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            @click="sendTestTelegram"
            :disabled="testingTg || !tgConfig.group_chat_id"
            class="px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-50 dark:bg-[#fcb4d5]/15 hover:bg-orange-100 dark:hover:bg-[#fcb4d5]/25 text-orange-700 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30 transition-all flex items-center space-x-1.5 disabled:opacity-40"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span>{{ testingTg ? 'Отправка...' : 'Тестовый пуш в группу' }}</span>
          </button>
        </div>
      </div>

      <!-- Telegram Config Form -->
      <form @submit.prevent="saveTgConfig" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Токен бота (BotFather):
          </label>
          <input
            v-model="tgConfig.token"
            type="password"
            placeholder="8089408611:AAF41B..."
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0E] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218] font-mono"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            ID чата / группы руководства:
          </label>
          <input
            v-model="tgConfig.group_chat_id"
            type="text"
            placeholder="-100xxxxxxxxxx или @chat"
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0E] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218] font-mono"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Username бота:
          </label>
          <div class="flex items-center space-x-2">
            <input
              v-model="tgConfig.bot_username"
              type="text"
              placeholder="ping_sstu_bot"
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0E] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218] font-mono"
            />
            <button
              type="submit"
              :disabled="savingTg"
              class="btn-neon px-4 py-2.5 rounded-xl text-xs font-black text-white flex-shrink-0 transition-all shadow-md disabled:opacity-40 flex items-center space-x-1.5"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>{{ savingTg ? 'Сохранение...' : 'Сохранить токен' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- 1. PENDING APPROVALS SECTION -->
    <div class="mb-10">
      <div class="flex items-center space-x-2.5 mb-4">
        <div class="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-300">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h2 class="text-sm font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          Заявки на модерации ({{ pendingUsers.length }})
        </h2>
      </div>

      <div v-if="pendingUsers.length === 0" class="cyber-glass rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#101016]/90">
        Входящих заявок на регистрацию нет. Все профили проверены и распределены по цехам.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="u in pendingUsers"
          :key="u.id"
          class="cyber-glass rounded-2xl p-5 border border-amber-300 dark:border-amber-500/30 flex flex-col justify-between shadow-sm dark:shadow-xl bg-white dark:bg-[#14141c]"
        >
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-[10px] font-black px-2.5 py-0.5 rounded-xl uppercase tracking-wider bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                Цех: {{ u.role }}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">ID: {{ u.id }}</span>
            </div>

            <h3 class="text-base font-black text-slate-900 dark:text-white mb-1">{{ u.name }}</h3>
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">Логин: <strong class="text-slate-800 dark:text-slate-200">@{{ u.username }}</strong></div>
            <div v-if="u.telegram_id" class="text-xs text-sky-600 dark:text-cyan-400 mb-4 font-mono">TG: {{ u.telegram_id }}</div>
          </div>

          <!-- Approve / Reject Controls -->
          <div class="pt-3 border-t border-slate-100 dark:border-white/10 space-y-3">
            <div class="flex items-center space-x-2">
              <label class="text-[11px] font-bold text-slate-600 dark:text-slate-300">Назначить уровень:</label>
              <select
                v-model="u._targetLevel"
                class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101016] text-slate-900 dark:text-white"
              >
                <option :value="1">1 (Стажёр)</option>
                <option :value="2">2 (Участник команды)</option>
                <option :value="3">3 (Руководство)</option>
                <option :value="4">4 (Главный администратор)</option>
                <option :value="5">5 (Хранитель)</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <button
                @click="approveUser(u)"
                class="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Одобрить заявку (+1)</span>
              </button>
              <button
                @click="rejectUser(u.id)"
                class="min-h-[44px] px-3.5 bg-red-50 dark:bg-red-600/20 hover:bg-red-100 dark:hover:bg-red-600/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
                <span>Отклонить заявку</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. APPROVED USERS TABLE & CONTROLS (Row Click Inspector) -->
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
            Активные профили участников команды ({{ approvedUsers.length }})
          </h2>
        </div>
        <div class="text-[11px] text-slate-600 dark:text-slate-300 bg-orange-50/80 dark:bg-[#fcb4d5]/10 px-3 py-1 rounded-xl border border-orange-200 dark:border-[#fcb4d5]/20 flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span><span class="text-orange-600 dark:text-[#fcb4d5] font-semibold">Нажмите на строчку</span> для просмотра задач и смены логина/пароля</span>
        </div>
      </div>

      <!-- Search, Filter & Sorting Controls (Requirement 7) -->
      <div class="mb-4 p-3.5 rounded-2xl cyber-glass border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <!-- Search Input -->
        <div class="relative flex-1">
          <svg class="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск участника по имени или @логину..."
            class="w-full text-xs pl-8 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08080C] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#0E0E14] transition-colors"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Role, Level & Sort Selectors -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Workshop / Role Filter -->
          <select
            v-model="filterRole"
            class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08080C] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#0E0E14]"
          >
            <option value="Все">Все цехи</option>
            <option value="Фото">Фото</option>
            <option value="Дизайн">Дизайн</option>
            <option value="Видео">Видео</option>
            <option value="Моушен">Моушен</option>
            <option value="СММ">СММ</option>
            <option value="Руководство">Руководство</option>
            <option value="Хранитель">Хранитель</option>
          </select>

          <!-- Level Filter -->
          <select
            v-model="filterLevel"
            class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08080C] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#0E0E14]"
          >
            <option value="Все">Все уровни</option>
            <option :value="1">1 ур. (Стажёр)</option>
            <option :value="2">2 ур. (Участник команды)</option>
            <option :value="3">3 ур. (Руководство)</option>
            <option :value="4">4 ур. (Администратор)</option>
            <option :value="5">5 ур. (Хранитель)</option>
          </select>

          <!-- Sort Selector -->
          <select
            v-model="sortBy"
            class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08080C] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#0E0E14] font-medium"
          >
            <option value="level_desc">Уровень доступа (сначала высший)</option>
            <option value="id_desc">По ID (сначала новые)</option>
            <option value="name_asc">Имя: А → Я</option>
            <option value="completed_desc">Выполнено задач (по убыванию)</option>
            <option value="can_create">Право создания задач (активные)</option>
          </select>

          <!-- Count Badge -->
          <span class="text-[11px] font-mono text-orange-700 dark:text-[#fcb4d5] bg-orange-50 dark:bg-[#fcb4d5]/15 px-2.5 py-1.5 rounded-xl border border-orange-200 dark:border-[#fcb4d5]/30 whitespace-nowrap">
            Найдено: <b>{{ filteredApprovedUsers.length }}</b> / {{ approvedUsers.length }}
          </span>
        </div>
      </div>

      <div class="cyber-glass rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th class="py-3.5 px-4">Пользователь</th>
                <th class="py-3.5 px-4">Цех</th>
                <th class="py-3.5 px-4 text-center">Уровень доступа</th>
                <th class="py-3.5 px-4 text-center">Создание задач (1 ур.)</th>
                <th class="py-3.5 px-4 text-center">Выполнено</th>
                <th class="py-3.5 px-4 text-right">Управление</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-white/5">
              <tr v-if="filteredApprovedUsers.length === 0">
                <td colspan="6" class="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  Участники по заданным параметрам поиска не найдены.
                </td>
              </tr>
              <tr
                v-for="u in filteredApprovedUsers"
                :key="u.id"
                @click="inspectUser(u)"
                class="hover:bg-orange-50/60 dark:hover:bg-[#fcb4d5]/10 cursor-pointer transition-colors group"
                :class="selectedUser?.id === u.id ? 'bg-orange-50 dark:bg-[#fcb4d5]/15 ring-1 ring-inset ring-orange-400 dark:ring-[#fcb4d5]' : ''"
              >
                <td class="py-3 px-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center font-bold text-xs flex-shrink-0 text-orange-700 dark:text-[#fcb4d5] group-hover:border-orange-500 dark:group-hover:border-[#fcb4d5] transition-colors">
                      <img v-if="u.avatar_url" :src="u.avatar_url" class="w-full h-full object-cover">
                      <span v-else>{{ u.name.charAt(0) }}</span>
                    </div>
                    <div>
                      <div class="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 group-hover:text-orange-600 dark:group-hover:text-[#fcb4d5] transition-colors">
                        <span>{{ u.name }}</span>
                        <span v-if="u.username === 'admin'" class="text-[9px] font-black px-1.5 py-0.2 rounded bg-pink-600 text-white font-mono shadow-xs">
                          ROOT ХРАНИТЕЛЬ
                        </span>
                        <span v-if="u.is_online" class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" title="В сети"></span>
                      </div>
                      <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">@{{ u.username }}</div>
                    </div>
                  </div>
                </td>

                <td class="py-3 px-4">
                  <span class="font-semibold text-slate-700 dark:text-slate-200">{{ u.role }}</span>
                </td>

                <td class="py-3 px-4 text-center">
                  <span
                    class="text-[10px] font-black px-2 py-0.5 rounded-full border uppercase font-mono"
                    :class="u.access_level >= 5
                      ? 'bg-pink-100 dark:bg-pink-500/25 text-pink-700 dark:text-[#fcb4d5] border-pink-300 dark:border-[#fcb4d5]/40 shadow-xs'
                      : (u.access_level === 4
                        ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30'
                        : (u.access_level === 3
                          ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                          : 'bg-slate-100 dark:bg-slate-700/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600/30'))"
                  >
                    {{ u.access_level >= 5 ? '5 ур. (Хранитель)' : `${u.access_level} ур.` }}
                  </span>
                </td>

                <td class="py-3 px-4 text-center" @click.stop>
                  <button
                    @click="toggleCanCreateTasks(u)"
                    class="text-[10px] font-black px-3 py-1 rounded-xl border transition-all inline-flex items-center gap-1.5 active:scale-95"
                    :class="u.can_create_tasks
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'"
                    :title="u.can_create_tasks ? 'Разрешено создавать задачи' : 'Запрещено'"
                  >
                    <svg v-if="u.can_create_tasks" class="w-3 h-3 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <svg v-else class="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                    <span>{{ u.can_create_tasks ? 'Включено' : 'Отключено' }}</span>
                  </button>
                </td>

                <td class="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                  {{ u.completed_tasks }}
                </td>

                <td class="py-3 px-4 text-right space-x-2" @click.stop>
                  <button
                    @click="inspectUser(u, 'edit')"
                    class="px-2.5 py-1 text-xs font-bold text-orange-700 dark:text-kedrRose hover:text-orange-900 dark:hover:text-white bg-orange-50 dark:bg-kedrRose/10 hover:bg-orange-100 dark:hover:bg-kedrRose/20 rounded-lg border border-orange-200 dark:border-kedrRose/30 transition-all inline-flex items-center space-x-1"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                    </svg>
                    <span>Редактировать</span>
                  </button>

                  <button
                    v-if="u.username !== 'admin'"
                    @click="deleteUser(u)"
                    class="px-2 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/40 rounded-lg border border-rose-200 dark:border-rose-500/30 transition-all inline-flex items-center justify-center"
                    title="Удалить профиль с освобождением задач"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- User Inspection Modal (Row Click Inspector) -->
    <div
      v-if="selectedUser"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
      @click.self="closeInspector"
    >
      <div class="cyber-glass max-w-4xl w-full max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 dark:border-[#fcb4d5]/30 shadow-2xl overflow-hidden bg-white dark:bg-[#0A0A0E] animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Modal Top Bar -->
        <div class="px-6 py-4 bg-slate-50 dark:bg-[#121218] border-b border-slate-200 dark:border-[#fcb4d5]/20 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center space-x-3.5">
            <div
              class="w-12 h-12 rounded-2xl overflow-hidden bg-orange-500/20 dark:bg-[#fcb4d5]/20 border border-orange-500/30 dark:border-[#fcb4d5]/40 flex items-center justify-center font-black text-sm relative group cursor-pointer shadow-md text-orange-700 dark:text-[#fcb4d5]"
              @click="triggerAvatarUpload"
              title="Нажмите для загрузки нового аватара сотрудника"
            >
              <img v-if="selectedUser.avatar_url" :src="selectedUser.avatar_url" class="w-full h-full object-cover">
              <span v-else>{{ selectedUser.name.charAt(0) }}</span>
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
                <span v-if="selectedUser.is_online" class="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                  Онлайн
                </span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400">
                Цех: <span class="text-orange-600 dark:text-[#fcb4d5] font-semibold">{{ selectedUser.role }}</span> • <span class="font-mono">@{{ selectedUser.username }}</span>
              </div>
            </div>
          </div>

          <button
            @click="closeInspector"
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-sm transition-colors"
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
          <div v-if="feedbackMsg" class="p-3.5 rounded-xl text-xs font-bold flex items-center justify-between" :class="feedbackIsError ? 'bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300' : 'bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'">
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
                <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">В работе</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-white/10 text-center">
                <div class="text-lg font-black text-purple-600 dark:text-purple-300">{{ reviewTasksCount }}</div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">На проверке</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-white/10 text-center">
                <div class="text-lg font-black text-emerald-600 dark:text-emerald-300">{{ doneTasksCount }}</div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Выполнено</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-white/10 text-center">
                <div class="text-lg font-black text-orange-600 dark:text-[#fcb4d5]">{{ selectedUser.average_score }} <span class="text-xs text-slate-400">/10</span></div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Средний балл</div>
              </div>
            </div>

            <!-- Loading indicator -->
            <div v-if="loadingTasks" class="text-center py-10 text-xs text-slate-500 dark:text-slate-400">
              Загрузка задач сотрудника...
            </div>

            <!-- Empty Tasks -->
            <div v-else-if="inspectorTasks.length === 0" class="p-8 text-center rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs">
              У этого сотрудника пока нет назначенных или завершенных задач.
            </div>

            <!-- Tasks Groups -->
            <div v-else class="space-y-5">
              <!-- 1. In Progress & Rework -->
              <div v-if="groupedTasks.in_progress.length > 0">
                <h4 class="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-2.5 flex items-center space-x-1.5">
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
                      <div class="font-bold text-slate-900 dark:text-white text-xs flex items-center space-x-2">
                        <span>{{ t.title }}</span>
                        <span v-if="t.status === 'rework'" class="text-[9px] bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-500/30">
                          Доработка
                        </span>
                      </div>
                      <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-3">
                        <span>Цех: <b class="text-slate-700 dark:text-slate-300">{{ t.direction }}</b></span>
                        <span v-if="t.deadline">Дедлайн: <b class="text-amber-600 dark:text-amber-400">{{ t.deadline }}</b></span>
                        <span v-if="t.comments_count" class="flex items-center space-x-1">
                          <svg class="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          <span>{{ t.comments_count }}</span>
                        </span>
                      </div>
                    </div>
                    <router-link
                      :to="`/task/${t.id}`"
                      class="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/30 border border-amber-200 dark:border-amber-500/30 transition-colors flex-shrink-0 ml-3"
                    >
                      К задаче →
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- 2. Review Queue -->
              <div v-if="groupedTasks.review.length > 0">
                <h4 class="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-2.5 flex items-center space-x-1.5">
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
                      <div class="font-bold text-slate-900 dark:text-white text-xs">{{ t.title }}</div>
                      <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-3">
                        <span>Цех: <b class="text-slate-700 dark:text-slate-300">{{ t.direction }}</b></span>
                        <span v-if="t.result_url" class="text-sky-600 dark:text-cyan-400 font-mono flex items-center space-x-1">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          <span>Материалы сданы</span>
                        </span>
                      </div>
                    </div>
                    <router-link
                      :to="`/task/${t.id}`"
                      class="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-purple-500/30 transition-colors flex-shrink-0 ml-3"
                    >
                      Оценить работу →
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- 3. Done & Graded -->
              <div v-if="groupedTasks.done.length > 0">
                <h4 class="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-2.5 flex items-center space-x-1.5">
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
                      <div class="font-bold text-slate-900 dark:text-white text-xs">{{ t.title }}</div>
                      <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-3">
                        <span>Оценка: <b class="text-emerald-600 dark:text-emerald-400 text-xs">{{ t.score }} / 10</b></span>
                        <span v-if="t.graded_by">Проверил: {{ t.graded_by.name }}</span>
                      </div>
                    </div>
                    <router-link
                      :to="`/task/${t.id}`"
                      class="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 transition-colors flex-shrink-0 ml-3"
                    >
                      Просмотр →
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: EDIT PROFILE & CREDENTIALS -->
          <div v-if="activeTab === 'edit'" class="space-y-5">
            <div class="p-3.5 rounded-2xl bg-orange-50/80 dark:bg-[#fcb4d5]/10 border border-orange-200 dark:border-[#fcb4d5]/20 text-xs text-slate-700 dark:text-slate-200 leading-relaxed flex items-start space-x-2.5">
              <div class="w-5 h-5 rounded-lg bg-orange-500/15 dark:bg-[#fcb4d5]/20 border border-orange-500/30 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5] flex-shrink-0 mt-0.5">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-1.5 1.5L12 11l4 4 5.5-5.5a2.12 2.12 0 0 0 0-3L20 5l-1.5-1.5Z"/><path d="M15 5 9 11l-4 4-2 6 6-2 4-4 6-6"/></svg>
              </div>
              <div>
                <span class="font-bold text-slate-900 dark:text-white">Редактирование профиля Администратором: </span>
                Изменение логина, генерация нового пароля при утере доступа, корректировка ФИО, направления (цеха) и уровня доступа (1..4).
              </div>
            </div>

            <!-- Avatar Upload Section (Requirement 9) -->
            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121218] border border-slate-200 dark:border-[#fcb4d5]/20 flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center font-bold text-sm text-orange-700 dark:text-white">
                  <img v-if="selectedUser.avatar_url" :src="selectedUser.avatar_url" class="w-full h-full object-cover">
                  <span v-else>{{ selectedUser.name.charAt(0) }}</span>
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white">Аватар сотрудника</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">Администратор 4-го уровня может сменить аватарку любого участника</div>
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
                    <span v-if="!(selectedUser.access_level >= 5 && user?.id !== selectedUser.id && user?.username !== 'admin')" class="text-[10px] text-slate-500 dark:text-slate-400 lowercase font-normal">(оставьте пустым, если не меняется)</span>
                  </label>
                  <div v-if="selectedUser.access_level >= 5 && user?.id !== selectedUser.id && user?.username !== 'admin'" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center space-x-2">
                    <svg class="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>🔒 Пароль пользователя 5 уровня (Хранитель) защищен. Изменить его может только сам владелец или Root-Хранитель.</span>
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
                    :disabled="selectedUser.access_level >= 5 && user?.id !== selectedUser.id && user?.username !== 'admin'"
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
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Уровень доступа (1..5):</label>
                    <button
                      v-if="user?.username === 'admin' && selectedUser.access_level >= 5 && selectedUser.username !== 'admin'"
                      type="button"
                      @click="editForm.access_level = 2; if (editForm.role === 'Хранитель') editForm.role = 'Дизайн'"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition"
                    >
                      ⬇ Снять статус Хранителя
                    </button>
                  </div>
                  <select
                    v-model.number="editForm.access_level"
                    :disabled="selectedUser.username === 'admin' || (selectedUser.access_level >= 5 && user?.username !== 'admin')"
                    class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0A0D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white dark:focus:bg-[#121218] disabled:opacity-40"
                  >
                    <option :value="1">1 уровень — Стажёр (контент-план, материалы, профиль)</option>
                    <option :value="2">2 уровень — Участник команды (+ общий чат)</option>
                    <option :value="3">3 уровень — Руководство медиацентра</option>
                    <option :value="4">4 уровень — Главный администратор</option>
                    <option :value="5">5 уровень — Хранитель (Pink Crown)</option>
                  </select>
                </div>

                <!-- Can create tasks flag -->
                <div class="flex items-center space-x-3 pt-6">
                  <input
                    id="adminCanCreateCheck"
                    v-model="editForm.can_create_tasks"
                    type="checkbox"
                    class="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#101016] text-orange-500 dark:text-kedrRose focus:ring-orange-500 dark:focus:ring-kedrRose focus:ring-offset-0"
                  />
                  <label for="adminCanCreateCheck" class="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    Разрешить создавать задачи (для 1–2 уровня)
                  </label>
                </div>

              </div>

              <!-- Submit Buttons -->
              <div class="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  @click="activeTab = 'tasks'"
                  class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
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

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const { showNotification, user } = useAuthStore();

const pendingUsers = ref([]);
const approvedUsers = ref([]);

// Search, Role & Level Filters, and Sorting (Requirement 7)
const searchQuery = ref('');
const filterRole = ref('Все');
const filterLevel = ref('Все');
const sortBy = ref('level_desc');

const filteredApprovedUsers = computed(() => {
  let list = [...approvedUsers.value];

  // 1. Role filter
  if (filterRole.value && filterRole.value !== 'Все') {
    list = list.filter(u => u.role === filterRole.value);
  }

  // 2. Level filter
  if (filterLevel.value !== 'Все') {
    const lvl = Number(filterLevel.value);
    list = list.filter(u => u.access_level === lvl);
  }

  // 3. Search query (name or username)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  }

  // 4. Sort
  list.sort((a, b) => {
    switch (sortBy.value) {
      case 'level_desc':
        if ((b.access_level || 0) !== (a.access_level || 0)) {
          return (b.access_level || 0) - (a.access_level || 0);
        }
        return (b.id || 0) - (a.id || 0);
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '', 'ru');
      case 'completed_desc':
        return (b.completed_tasks || 0) - (a.completed_tasks || 0);
      case 'can_create':
        return (b.can_create_tasks ? 1 : 0) - (a.can_create_tasks ? 1 : 0);
      case 'id_desc':
      default:
        return (b.id || 0) - (a.id || 0);
    }
  });

  return list;
});

// Telegram Config State
const tgConfig = ref({
  token: '',
  group_chat_id: '',
  bot_username: 'ping_sstu_bot',
  is_active: false
});
const savingTg = ref(false);
const testingTg = ref(false);

// Inspector State (Same as in ManagementView)
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
    const idx = approvedUsers.value.findIndex(u => u.id === selectedUser.value.id);
    if (idx !== -1) {
      approvedUsers.value[idx].avatar_url = data.avatar_url;
    }
    const authStore = useAuthStore();
    if (authStore.user?.id === selectedUser.value.id) {
      authStore.user.avatar_url = data.avatar_url;
    }
    feedbackMsg.value = 'Аватар пользователя успешно обновлен!';
    feedbackIsError.value = false;
    showNotification('Аватар пользователя успешно обновлен!', 'success');
  } catch (err) {
    feedbackMsg.value = err.message;
    feedbackIsError.value = true;
    showNotification(err.message, 'error');
  } finally {
    uploadingAvatar.value = false;
    if (avatarInputRef.value) avatarInputRef.value.value = '';
  }
};

const editForm = ref({
  name: '',
  username: '',
  role: 'Фото',
  access_level: 1,
  password: '',
  can_create_tasks: false
});

const getLevelBadgeClass = (lvl) => {
  if (lvl >= 5) return 'bg-pink-100 dark:bg-pink-500/25 text-pink-700 dark:text-[#fcb4d5] border-pink-300 dark:border-[#fcb4d5]/40 shadow-xs';
  if (lvl === 4) return 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30';
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

const inspectUser = async (u, defaultTab = 'tasks') => {
  selectedUser.value = u;
  activeTab.value = defaultTab;
  feedbackMsg.value = '';
  feedbackIsError.value = false;

  editForm.value = {
    name: u.name,
    username: u.username,
    role: u.role,
    access_level: u.access_level,
    password: '',
    can_create_tasks: Boolean(u.can_create_tasks)
  };

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

    if (data.user) {
      selectedUser.value = { ...selectedUser.value, ...data.user };
      const idx = approvedUsers.value.findIndex(u => u.id === selectedUser.value.id);
      if (idx !== -1) {
        approvedUsers.value[idx] = { ...approvedUsers.value[idx], ...data.user };
      }
    }
    editForm.value.password = '';
    showNotification('Данные профиля сохранены!');
  } catch (err) {
    feedbackMsg.value = err.message;
    feedbackIsError.value = true;
  } finally {
    savingUser.value = false;
  }
};

const fetchAdminData = async () => {
  try {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      pendingUsers.value = (data.pending_users || []).map(u => ({ ...u, _targetLevel: 1 }));
      approvedUsers.value = data.approved_users || [];
    }
  } catch (e) {
    console.error('Failed to load admin users:', e);
  }
};

const fetchTgConfig = async () => {
  try {
    const res = await fetch('/api/admin/telegram-config');
    if (res.ok) {
      const data = await res.json();
      tgConfig.value = data;
    }
  } catch (e) {
    console.error('Failed to load telegram config:', e);
  }
};

const saveTgConfig = async () => {
  savingTg.value = true;
  try {
    const res = await fetch('/api/admin/telegram-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgConfig.value)
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || 'Настройки Telegram бота сохранены!');
      await fetchTgConfig();
    } else {
      showNotification(data.error || 'Ошибка сохранения настроек', 'error');
    }
  } catch (e) {
    showNotification('Ошибка сети: ' + e.message, 'error');
  } finally {
    savingTg.value = false;
  }
};

const sendTestTelegram = async () => {
  testingTg.value = true;
  try {
    const res = await fetch('/api/admin/telegram-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tgConfig.value.group_chat_id })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || 'Тестовое уведомление успешно отправлено в Telegram!');
    } else {
      showNotification(data.error || 'Ошибка отправки тестового пуша', 'error');
    }
  } catch (e) {
    showNotification('Ошибка связи с Telegram: ' + e.message, 'error');
  } finally {
    testingTg.value = false;
  }
};

const approveUser = async (u) => {
  try {
    const res = await fetch(`/api/admin/users/${u.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_level: u._targetLevel })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message);
      await fetchAdminData();
    }
  } catch (e) {}
};

const rejectUser = async (id) => {
  if (!confirm('Отклонить и удалить заявку?')) return;
  try {
    const res = await fetch(`/api/admin/users/${id}/reject`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message, 'warning');
      await fetchAdminData();
    }
  } catch (e) {}
};

const toggleCanCreateTasks = async (u) => {
  try {
    const res = await fetch(`/api/admin/users/${u.id}/toggle-create-tasks`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message);
      u.can_create_tasks = data.can_create_tasks;
    }
  } catch (e) {}
};

const deleteUser = async (u) => {
  if (!confirm(`Вы действительно хотите удалить профиль «${u.name}»? Все его текущие задачи будут автоматически возвращены в статус «open».`)) return;
  try {
    const res = await fetch(`/api/admin/users/${u.id}/delete`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message);
      await fetchAdminData();
    } else {
      alert(data.error);
    }
  } catch (e) {}
};

onMounted(() => {
  Promise.all([fetchAdminData(), fetchTgConfig()]);
});
</script>
