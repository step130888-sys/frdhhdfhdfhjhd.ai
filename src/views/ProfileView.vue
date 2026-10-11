<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-8">
    <div v-if="loading" class="text-center py-24 text-slate-400 text-xs">
      <div class="animate-spin w-8 h-8 border-2 border-orange-500 dark:border-[#fcb4d5] border-t-transparent rounded-full mx-auto mb-3"></div>
      Загрузка профиля...
    </div>

    <div v-else-if="!profileUser" class="text-center py-24 text-slate-400">
      Пользователь не найден
    </div>

    <div v-else class="space-y-8">
      
      <!-- Profile Header Card (Pure Apple Liquid Glass) -->
      <div class="cyber-glass rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <!-- Avatar & Details -->
          <div class="flex items-center space-x-5">
            <!-- Avatar with online status ring -->
            <div class="relative flex-shrink-0">
              <div class="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 border-2 border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center font-black text-2xl text-orange-700 dark:text-[#fcb4d5] shadow-xl">
                <img v-if="profileUser.avatar_url" :src="profileUser.avatar_url" :alt="profileUser.name" class="w-full h-full object-cover">
                <span v-else>{{ profileUser.name.charAt(0) }}</span>
              </div>
              <span
                v-if="profileUser.is_online"
                class="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-black rounded-full shadow-sm"
                title="Сейчас в сети"
              ></span>
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{{ profileUser.name }}</h1>
                <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30">
                  {{ profileUser.role }}
                </span>
                <span
                  class="text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider inline-flex items-center gap-1 shadow-xs"
                  :class="profileUser.access_level >= 5
                    ? 'bg-pink-100 dark:bg-pink-500/25 text-pink-700 dark:text-[#fcb4d5] border-pink-300 dark:border-[#fcb4d5]/40'
                    : (profileUser.access_level === 4
                      ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30'
                      : (profileUser.access_level === 3
                        ? 'bg-orange-500/15 text-orange-600 dark:text-[#fcb4d5] border-orange-500/30 dark:border-[#fcb4d5]/30'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'))"
                >
                  <span v-if="profileUser.access_level >= 5">👑 5 ур. • Хранитель</span>
                  <span v-else-if="profileUser.access_level === 4">⚡ 4 ур. • Администратор</span>
                  <span v-else-if="profileUser.access_level === 3">⭐ 3 ур. • Руководство</span>
                  <span v-else-if="profileUser.access_level === 2">🛠 2 ур. • Глава цеха</span>
                  <span v-else>1 ур. • Участник</span>
                </span>
              </div>

              <div class="text-xs text-slate-400 font-medium">
                @{{ profileUser.username }} •
                <span v-if="profileUser.is_online" class="text-emerald-500 font-bold">● В сети</span>
                <span v-else>Был(а) в сети: {{ profileUser.last_seen_formatted || 'недавно' }}</span>
              </div>

              <!-- Avatar change trigger (Self or Admin) -->
              <div v-if="canEditAvatar" class="mt-3">
                <label class="cursor-pointer text-[11px] font-bold text-orange-600 dark:text-[#fcb4d5] hover:text-orange-700 dark:hover:text-white bg-orange-50 dark:bg-[#fcb4d5]/10 hover:bg-orange-100 dark:hover:bg-[#fcb4d5]/20 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-[#fcb4d5]/30 transition-all inline-flex items-center space-x-1.5">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>Сменить аватар</span>
                  <input type="file" @change="uploadAvatar" class="hidden" accept="image/*" />
                </label>
              </div>
            </div>
          </div>

          <!-- Quick Actions: Force Assign -->
          <div class="flex flex-wrap items-center gap-3">
            <button
              v-if="canForceAssign"
              @click="showAssignModal = true"
              class="btn-neon px-5 py-3 rounded-2xl text-xs font-black shadow-xl flex items-center space-x-2"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span>Принудительно выдать задачу</span>
            </button>
          </div>

        </div>

        <!-- KPI Metrics Grid (Atomic SQLite Calculation) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200/80 dark:border-white/10">
          <div class="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-center transition-colors">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Выполнено задач</span>
            <span class="text-2xl font-black text-slate-800 dark:text-white font-mono">{{ profileUser.completed_tasks }}</span>
          </div>

          <div class="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-center transition-colors">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Средний балл (1..10)</span>
            <span class="text-2xl font-black text-orange-600 dark:text-[#fcb4d5] font-mono">{{ profileUser.average_score }} <span class="text-xs text-slate-400 dark:text-slate-500 font-sans">/ 10.0</span></span>
          </div>

          <div class="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-center transition-colors">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">В работе сейчас</span>
            <span class="text-2xl font-black text-amber-600 dark:text-amber-300 font-mono">{{ inProgressCount }}</span>
          </div>

          <div class="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-center transition-colors">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">На проверке</span>
            <span class="text-2xl font-black text-purple-600 dark:text-purple-300 font-mono">{{ reviewCount }}</span>
          </div>
        </div>

      </div>

      <!-- Telegram & VK Bindings Card -->
      <div v-if="isMe || isSuperAdmin" class="cyber-glass rounded-3xl p-6 border border-slate-200/80 dark:border-white/10">
        <h3 class="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-[#fcb4d5] mb-4 flex items-center space-x-2">
          <svg class="w-4 h-4 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="12" x="3" y="8" rx="2"/><path d="M12 2v6"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>
          </svg>
          <span>Привязка ботов Telegram и ВКонтакте</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Telegram Card (Available strictly for level >= 3) -->
          <div v-if="profileUser?.access_level < 3" class="p-5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div class="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-2.5">
                <div class="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <span class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Telegram-бот (3–5 уровень)</span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                Подключение Telegram-бота зарезервировано для <strong>Руководства</strong>, <strong>Администраторов</strong> и <strong>Хранителей</strong> (3, 4 и 5 уровень доступа).
              </p>
            </div>
            <div class="p-3 rounded-xl bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200/80 dark:border-orange-500/20 text-[11px] text-orange-800 dark:text-[#fcb4d5]">
              💡 Для участников 1 и 2 уровней все уведомления по задачам, правкам и дедлайнам приходят в <strong>бота ВКонтакте</strong>. Подключите VK справа!
            </div>
          </div>

          <div v-else class="p-5 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                  <div class="w-7 h-7 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9]">
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.95l11.57-4.458c.538-.196 1.006.128.832.943z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 dark:text-white leading-tight">Telegram-уведомления</h4>
                    <span class="text-[10px] text-slate-400 font-medium">Руководство & Хранители</span>
                  </div>
                </div>

                <span
                  v-if="profileUser?.telegram_id"
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Привязан: {{ profileUser.telegram_id }}</span>
                </span>
                <span
                  v-else
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                >
                  Не привязан
                </span>
              </div>

              <!-- 1-Click Bind Button -->
              <button
                type="button"
                @click="oneClickBindTelegram"
                class="w-full mb-3 py-2.5 px-3.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#1b8ec5] hover:to-[#0077b3] shadow-xs shadow-[#229ED9]/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <svg class="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.95l11.57-4.458c.538-.196 1.006.128.832.943z"/>
                </svg>
                <span>{{ isPollingTgBind ? '⏳ Ожидаем нажатия в боте...' : '⚡ Привязать Telegram в 1 клик' }}</span>
              </button>
            </div>

            <div>
              <div class="text-[10px] text-slate-400 mb-1">Или укажите вручную @username / ID:</div>
              <div class="flex items-center space-x-2">
                <input
                  v-model="telegramId"
                  type="text"
                  placeholder="@username или ID"
                  class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] font-mono"
                />
                <button
                  @click="bindTelegram"
                  class="btn-neon px-4 py-2 rounded-xl text-xs font-black flex-shrink-0"
                >
                  Сохранить
                </button>
                <button
                  v-if="profileUser?.telegram_id"
                  @click="unbindTelegram"
                  title="Отвязать Telegram"
                  class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs flex-shrink-0 transition-colors"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- VK Card (Full Informative Redesign) -->
          <div class="p-5 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 flex flex-col justify-between">
            <div>
              <!-- Header with Status -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                  <div class="w-7 h-7 rounded-xl bg-[#0077FF]/15 border border-[#0077FF]/30 flex items-center justify-center text-[#0077FF]">
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M15.684 0H8.316C2.992 0 0 2.992 0 8.316v7.368C0 21.008 2.992 24 8.316 24h7.368C21.008 24 24 21.008 24 15.684V8.316C24 2.992 21.008 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.05-1.713-1.034-1.01-1.492-1.144-1.747-1.144-.356 0-.458.102-.458.593v1.543c0 .424-.135.68-1.254.68-1.847 0-3.898-1.118-5.34-3.197-2.17-3.07-2.763-5.39-2.763-5.864 0-.254.102-.491.593-.491h1.746c.44 0 .61.203.78.678.847 2.475 2.271 4.644 2.864 4.644.22 0 .322-.102.322-.661V10.41c-.068-1.186-.695-1.288-.695-1.712 0-.203.17-.407.44-.407h2.746c.373 0 .508.187.508.627v3.39c0 .373.17.508.271.508.22 0 .407-.135.814-.542 1.288-1.44 2.203-3.66 2.203-3.66.119-.254.34-.491.78-.491h1.746c.525 0 .644.271.525.644-.22 1.017-2.356 4.034-2.458 4.186-.237.356-.322.508 0 .932.237.339 1.017 1.017 1.542 1.627 1.017 1.153 1.814 2.119 2.017 2.78.203.66-.102.949-.576.949z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 dark:text-white leading-tight">Бот ВКонтакте</h4>
                    <span class="text-[10px] text-slate-400 font-medium">Для всех участников цехов (1–5 ур.)</span>
                  </div>
                </div>

                <div v-if="profileUser?.vk_id">
                  <a
                    :href="`https://vk.com/id${profileUser.vk_id}`"
                    target="_blank"
                    class="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 hover:underline shadow-2xs"
                    title="Открыть страницу ВКонтакте"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>id{{ profileUser.vk_id }} ↗</span>
                  </a>
                </div>
                <div v-else class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Не привязан
                </div>
              </div>

              <!-- Step-by-step guidance box -->
              <div class="mb-3 p-3 rounded-xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 space-y-1.5">
                <div class="text-[11px] font-bold text-slate-800 dark:text-white flex items-center space-x-1">
                  <span>📋 Инструкция по подключению:</span>
                </div>
                <ol class="text-[11px] space-y-1 text-slate-600 dark:text-slate-400 list-decimal list-inside leading-relaxed">
                  <li>Нажмите кнопку <strong>«Написать боту ВКонтакте»</strong> ниже и отправьте любое сообщение (например, «Привет»), чтобы бот получил право отправлять вам задачи и напоминания.</li>
                  <li>Скопируйте ссылку на свой профиль VK (или ID/ник) в поле ввода и нажмите <strong>«Привязать»</strong>.</li>
                </ol>
              </div>

              <!-- Direct Chat Link Button -->
              <a
                href="https://vk.com/im?sel=-242133035"
                target="_blank"
                class="w-full mb-3 py-2 px-3 rounded-xl text-xs font-bold text-white bg-[#0077FF] hover:bg-[#0066dd] shadow-xs shadow-[#0077FF]/30 flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <svg class="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M15.684 0H8.316C2.992 0 0 2.992 0 8.316v7.368C0 21.008 2.992 24 8.316 24h7.368C21.008 24 24 21.008 24 15.684V8.316C24 2.992 21.008 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.05-1.713-1.034-1.01-1.492-1.144-1.747-1.144-.356 0-.458.102-.458.593v1.543c0 .424-.135.68-1.254.68-1.847 0-3.898-1.118-5.34-3.197-2.17-3.07-2.763-5.39-2.763-5.864 0-.254.102-.491.593-.491h1.746c.44 0 .61.203.78.678.847 2.475 2.271 4.644 2.864 4.644.22 0 .322-.102.322-.661V10.41c-.068-1.186-.695-1.288-.695-1.712 0-.203.17-.407.44-.407h2.746c.373 0 .508.187.508.627v3.39c0 .373.17.508.271.508.22 0 .407-.135.814-.542 1.288-1.44 2.203-3.66 2.203-3.66.119-.254.34-.491.78-.491h1.746c.525 0 .644.271.525.644-.22 1.017-2.356 4.034-2.458 4.186-.237.356-.322.508 0 .932.237.339 1.017 1.017 1.542 1.627 1.017 1.153 1.814 2.119 2.017 2.78.203.66-.102.949-.576.949z"/>
                </svg>
                <span>💬 Написать боту ВКонтакте (@sms_sgtu)</span>
              </a>
            </div>

            <div>
              <div class="text-[10px] text-slate-400 mb-1">Ссылка на страницу или ID:</div>
              <div class="flex items-center space-x-2">
                <input
                  v-model="vkId"
                  type="text"
                  placeholder="https://vk.com/id... или никнейм"
                  class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10] text-slate-900 dark:text-white focus:outline-none focus:border-[#0077FF] font-mono"
                />
                <button
                  @click="bindVk"
                  class="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#0077FF] hover:bg-[#0066dd] flex-shrink-0 transition-colors cursor-pointer"
                >
                  {{ profileUser?.vk_id ? 'Обновить' : 'Привязать' }}
                </button>
                <button
                  v-if="profileUser?.vk_id"
                  @click="unbindVk"
                  title="Отвязать ВКонтакте"
                  class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs flex-shrink-0 transition-colors cursor-pointer"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Assigned Tasks Section (Requirement 5) -->
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded-lg bg-orange-50 dark:bg-[#fcb4d5]/15 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5]">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
            </div>
            <h2 class="text-base font-extrabold text-slate-900 dark:text-white">
              Задачи участника ({{ filteredTasks.length }})
            </h2>
          </div>

          <!-- Status Filters -->
          <div class="flex flex-wrap gap-1.5 items-center">
            <button
              v-for="st in [
                { label: 'Все', value: '' },
                { label: 'В работе', value: 'in_progress' },
                { label: 'Доработка', value: 'rework' },
                { label: 'Проверка', value: 'review' },
                { label: 'Готово', value: 'done' }
              ]"
              :key="st.value"
              @click="taskFilter = st.value"
              class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all"
              :class="taskFilter === st.value
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 dark:from-[#fcb4d5] dark:to-[#f9a8d4] text-white dark:text-black shadow-xs'
                : 'bg-white dark:bg-[#14141c] text-slate-700 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-orange-500 dark:hover:border-[#fcb4d5] hover:text-slate-900 dark:hover:text-slate-200'"
            >
              {{ st.label }}
            </button>
          </div>
        </div>

        <div v-if="filteredTasks.length === 0" class="cyber-glass rounded-2xl p-8 text-center text-slate-400 text-xs bg-white dark:bg-[#0c0c10] border border-slate-200 dark:border-white/10">
          Задач с выбранным статусом не найдено.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="cyber-glass-card rounded-2xl p-5 flex flex-col justify-between group cursor-pointer bg-white dark:bg-[#14141c] border border-slate-200 dark:border-white/10 hover:border-orange-500 dark:hover:border-[#fcb4d5] transition-all"
            @click="$router.push(`/task/${task.id}`)"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="text-[11px] font-black px-2.5 py-0.5 rounded-xl uppercase tracking-wider bg-orange-50 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30">
                  {{ task.direction }}
                </span>
                <span
                  class="text-[10px] font-black px-2.5 py-0.5 rounded-xl uppercase tracking-wider border font-mono"
                  :class="task.status === 'done' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' : (task.status === 'review' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30' : (task.status === 'rework' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'))"
                >
                  {{ task.status === 'done' ? `Готово (${task.score}/10)` : (task.status === 'review' ? 'Проверка' : (task.status === 'rework' ? 'Доработка' : 'В работе')) }}
                </span>
              </div>

              <h3 class="font-extrabold text-sm text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-[#fcb4d5] transition-colors">
                #{{ task.id }} {{ task.title }}
              </h3>

              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                {{ task.description }}
              </p>

              <div v-if="task.status === 'rework' && task.rework_notes" class="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-start space-x-1.5">
                <svg class="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div><span class="font-bold">Правки:</span> {{ task.rework_notes }}</div>
              </div>
            </div>

            <!-- Footer: Quick Chat button & Deadline -->
            <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs" @click.stop>
              <div v-if="task.deadline" class="text-[11px] font-mono text-amber-500 dark:text-amber-400 flex items-center space-x-1">
                <svg class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>{{ task.deadline }}</span>
              </div>
              <div v-else class="text-[11px] text-slate-400">Без дедлайна</div>

              <div class="flex items-center space-x-2">
                <router-link
                  :to="`/task/${task.id}`"
                  class="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-[#fcb4d5]/15 hover:bg-orange-100 dark:hover:bg-[#fcb4d5]/25 text-orange-600 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30 transition-all flex items-center space-x-1"
                >
                  <svg class="w-3.5 h-3.5 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Чат</span>
                  <span v-if="task.comments_count">({{ task.comments_count }})</span>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ideas & Suggestions Section («💡 Предложить идею») -->
      <div v-if="isMe || isLeader" class="cyber-glass rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-sm transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-xs">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v1"/><path d="M12 21v1"/><path d="M4.93 4.93l.7.7"/><path d="M18.36 18.36l.7.7"/><path d="M2 12h1"/><path d="M21 12h1"/><path d="M4.93 19.07l.7-.7"/><path d="M18.36 5.64l.7-.7"/>
                <circle cx="12" cy="12" r="5"/>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Предложенные идеи и инициативы</span>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {{ userIdeas.length }}
                </span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {{ isMe ? 'Ваши идеи с личным чатом для обсуждения с руководством (3–5 уровень)' : 'Идеи данного участника с историей обсуждения' }}
              </p>
            </div>
          </div>

          <button
            v-if="isMe"
            @click="showNewIdeaModal = true"
            class="btn-neon px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center space-x-2 shrink-0 cursor-pointer active:scale-95"
          >
            <span>💡 Предложить идею</span>
          </button>
        </div>

        <!-- Ideas List Grid -->
        <div v-if="userIdeas.length === 0" class="p-8 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 text-center">
          <div class="text-3xl mb-2">💡</div>
          <div class="text-xs font-bold text-slate-700 dark:text-slate-300">
            {{ isMe ? 'У вас пока нет предложенных идей' : 'Участник пока не предлагал идей' }}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {{ isMe ? 'Есть интересная мысль для видео, статьи, дизайна или спецпроекта? Нажмите кнопку выше — руководство сразу увидит ее и ответит вам в личном мини-чате!' : 'Все предложенные идеи участника будут отображаться здесь.' }}
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="item in userIdeas"
            :key="item.id"
            @click="openIdeaChat(item.id)"
            class="p-4.5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-amber-400/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase font-mono"
                  :class="getIdeaStatusBadgeClass(item.status)"
                >
                  {{ getIdeaStatusLabel(item.status) }}
                </span>
                <span class="text-[10px] text-slate-400 font-mono">
                  {{ formatIdeaDate(item.created_at) }}
                </span>
              </div>

              <h4 class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                {{ item.title }}
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {{ item.description }}
              </p>
            </div>

            <div class="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-white/5 text-[11px]">
              <span class="text-slate-500 dark:text-slate-400 flex items-center space-x-1 font-mono text-[10px]">
                <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>{{ item.comments_count || 1 }} сообщ. в чате</span>
              </span>
              <span class="text-amber-600 dark:text-amber-300 font-bold group-hover:translate-x-0.5 transition-transform flex items-center space-x-1">
                <span>Открыть чатик</span>
                <span>→</span>
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Forced Assignment Modal -->
    <ForceAssignModal
      v-if="profileUser"
      :is-open="showAssignModal"
      :target-user="profileUser"
      :open-tasks="openTasks"
      @close="showAssignModal = false"
      @assigned="onTaskForceAssigned"
    />

    <!-- New Idea Proposal Modal -->
    <NewIdeaModal
      :is-open="showNewIdeaModal"
      @close="showNewIdeaModal = false"
      @created="onIdeaCreated"
    />

    <!-- Idea Discussion Mini-Chat Modal -->
    <IdeaChatModal
      :is-open="showIdeaChatModal"
      :idea-id="activeIdeaId"
      @close="showIdeaChatModal = false"
      @status-updated="fetchUserIdeas"
      @deleted="onIdeaDeleted"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import ForceAssignModal from '../components/ForceAssignModal.vue';
import IdeaChatModal from '../components/IdeaChatModal.vue';
import NewIdeaModal from '../components/NewIdeaModal.vue';

const route = useRoute();
const { user, isLeader, isWorkshopHead, isSuperAdmin, showNotification } = useAuthStore();

const profileId = computed(() => parseInt(route.params.id, 10));
const profileUser = ref(null);
const userTasks = ref([]);
const openTasks = ref([]);
const inProgressCount = ref(0);
const reviewCount = ref(0);
const loading = ref(true);
const taskFilter = ref('');

const telegramId = ref('');
const vkId = ref('');
const showAssignModal = ref(false);

// Ideas & Mini-Chat state
const userIdeas = ref([]);
const showNewIdeaModal = ref(false);
const showIdeaChatModal = ref(false);
const activeIdeaId = ref(null);

const onIdeaDeleted = (deletedId) => {
  userIdeas.value = userIdeas.value.filter(i => i.id !== deletedId);
};

const filteredTasks = computed(() => {
  if (!taskFilter.value) return userTasks.value;
  return userTasks.value.filter(t => t.status === taskFilter.value);
});

const isMe = computed(() => user.value && user.value.id === profileId.value);
const canEditAvatar = computed(() => isMe.value || isSuperAdmin.value);
const canForceAssign = computed(() => {
  if (!user.value || !profileUser.value) return false;
  if (isLeader.value) return true;
  if (isWorkshopHead.value && user.value.role === profileUser.value.role) return true;
  if (user.value.can_create_tasks && user.value.role === profileUser.value.role) return true;
  return false;
});

const fetchUserIdeas = async () => {
  if (!profileId.value) return;
  try {
    const res = await fetch(`/api/ideas?user_id=${profileId.value}`);
    if (res.ok) {
      const data = await res.json();
      userIdeas.value = data.ideas || [];
    }
  } catch (e) {
    console.error('Failed to load ideas:', e);
  }
};

const openIdeaChat = (id) => {
  activeIdeaId.value = id;
  showIdeaChatModal.value = true;
};

const onIdeaCreated = (newIdea) => {
  showNotification('💡 Ваша идея успешно передана руководству!');
  fetchUserIdeas();
  if (newIdea && newIdea.id) {
    openIdeaChat(newIdea.id);
  }
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

const fetchProfile = async () => {
  if (!profileId.value) return;
  loading.value = true;
  try {
    const res = await fetch(`/api/users/${profileId.value}`);
    if (res.ok) {
      const data = await res.json();
      profileUser.value = data.user;
      userTasks.value = data.tasks || [];
      openTasks.value = data.open_tasks || [];
      inProgressCount.value = data.in_progress_count || 0;
      reviewCount.value = data.review_count || 0;
      telegramId.value = data.user.telegram_id || '';
      vkId.value = data.user.vk_id || '';
    }
    await fetchUserIdeas();
  } catch (e) {
    console.error('Failed to load profile:', e);
  } finally {
    loading.value = false;
  }
};

const uploadAvatar = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar_file', file);

  try {
    const res = await fetch(`/api/users/${profileId.value}/avatar`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('Аватар успешно обновлен!');
      await fetchProfile();
    } else {
      alert(data.error || 'Ошибка загрузки аватара');
    }
  } catch (err) {
    alert('Сетевая ошибка при загрузке аватара');
  }
};

const isPollingTgBind = ref(false);
let tgBindPollTimer = null;

const oneClickBindTelegram = () => {
  const url = `https://t.me/ping_sstu_bot?start=bind_${profileId.value}`;
  window.open(url, '_blank');
  isPollingTgBind.value = true;
  showNotification('Откройте Telegram и нажмите «Запустить» в боте...', 'info');

  if (tgBindPollTimer) clearInterval(tgBindPollTimer);
  let attempts = 0;
  tgBindPollTimer = setInterval(async () => {
    attempts++;
    if (attempts > 40) { // 60s timeout
      clearInterval(tgBindPollTimer);
      isPollingTgBind.value = false;
      return;
    }
    try {
      const prevTg = profileUser.value ? profileUser.value.telegram_id : null;
      await fetchProfile();
      if (profileUser.value && profileUser.value.telegram_id && profileUser.value.telegram_id !== prevTg) {
        clearInterval(tgBindPollTimer);
        isPollingTgBind.value = false;
        telegramId.value = profileUser.value.telegram_id;
        showNotification('🎉 Telegram успешно привязан в 1 клик!');
      }
    } catch (e) {}
  }, 1500);
};

const bindTelegram = async () => {
  try {
    const res = await fetch(`/api/users/${profileId.value}/bind-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId.value })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('Telegram успешно сохранен!');
      await fetchProfile();
    } else {
      alert(data.error || 'Ошибка привязки Telegram');
    }
  } catch (e) {
    alert('Сетевая ошибка при привязке Telegram');
  }
};

const unbindTelegram = async () => {
  if (!confirm('Отвязать Telegram-аккаунт от этого профиля?')) return;
  try {
    const res = await fetch(`/api/users/${profileId.value}/bind-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: '' })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('Telegram успешно отвязан.');
      telegramId.value = '';
      await fetchProfile();
    } else {
      alert(data.error || 'Ошибка при отвязке Telegram');
    }
  } catch (e) {
    alert('Сетевая ошибка при отвязке Telegram');
  }
};

const bindVk = async () => {
  try {
    const res = await fetch(`/api/users/${profileId.value}/bind-vk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vk_id: vkId.value })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('ВКонтакте успешно привязан!');
      await fetchProfile();
    } else {
      alert(data.error || 'Ошибка привязки VK');
    }
  } catch (e) {
    alert('Сетевая ошибка при привязке VK');
  }
};

const unbindVk = async () => {
  if (!confirm('Отвязать ВКонтакте от этого профиля?')) return;
  try {
    const res = await fetch(`/api/users/${profileId.value}/bind-vk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vk_id: '' })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('ВКонтакте успешно отвязан.');
      vkId.value = '';
      await fetchProfile();
    } else {
      alert(data.error || 'Ошибка при отвязке VK');
    }
  } catch (e) {
    alert('Сетевая ошибка при отвязке VK');
  }
};

const onTaskForceAssigned = (msg) => {
  showNotification(msg);
  fetchProfile();
};

watch(profileId, () => {
  fetchProfile();
});

onMounted(() => {
  fetchProfile();
});

onUnmounted(() => {
  if (tgBindPollTimer) clearInterval(tgBindPollTimer);
});
</script>
