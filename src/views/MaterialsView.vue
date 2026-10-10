<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
    
    <!-- Top Header & Upload Button -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <div class="flex items-center space-x-3 mb-1">
          <div class="w-9 h-9 rounded-xl bg-orange-50 dark:bg-[#fcb4d5]/15 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5] shadow-xs">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            </svg>
          </div>
          <h1 class="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            База рабочих материалов
          </h1>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Официальные брендбуки, шаблоны, шрифты, заставки и исходники для всех 5 цехов медиацентра.
        </p>
      </div>

      <!-- Upload Button (Level 3-4 only) -->
      <button
        v-if="isLeader"
        @click="showUploadModal = true"
        class="btn-neon px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center justify-center space-x-2 flex-shrink-0"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>Загрузить материал</span>
      </button>
    </div>

    <!-- VK BOT INTEGRATION CARD FOR PARTICIPANTS (Requirement 10) -->
    <div class="mb-8 cyber-glass rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-white/10 shadow-xs relative overflow-hidden">

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-start md:items-center space-x-3.5">
          <div class="w-12 h-12 rounded-2xl bg-[#2787F5]/15 dark:bg-[#2787F5]/20 border border-[#2787F5]/30 dark:border-[#2787F5]/40 flex items-center justify-center text-xl flex-shrink-0 shadow-md text-[#2787F5]">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center space-x-2.5">
              <h2 class="text-sm md:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Подключение ВКонтакте для участников
              </h2>
              <span
                class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1.5"
                :class="user?.vk_id ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600/30'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="user?.vk_id ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-400'"></span>
                <span>{{ user?.vk_id ? 'VK привязан' : 'Не привязан' }}</span>
              </span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Привяжите страницу ВКонтакте, чтобы бот медиацентра присылал вам уведомления о новых материалах, дедлайнах и задачах в ЛС, а также персональную статистику по кнопке <b class="text-orange-600 dark:text-[#fcb4d5]">«Моя статистика»</b>.
            </p>
          </div>
        </div>

        <!-- Binding action controls -->
        <div class="flex-shrink-0 flex items-center space-x-2 self-start md:self-auto">
          <template v-if="user?.vk_id && !editingVk">
            <a
              :href="`https://vk.com/id${user.vk_id}`"
              target="_blank"
              class="text-xs text-sky-700 dark:text-[#529ef4] hover:text-sky-800 dark:hover:text-white font-mono font-semibold bg-sky-50 dark:bg-[#2787F5]/15 px-3 py-2 rounded-xl border border-sky-200 dark:border-[#2787F5]/30 transition-all flex items-center space-x-1"
            >
              <span>id{{ user.vk_id }}</span>
              <span>↗</span>
            </a>
            <button
              @click="startEditVk"
              class="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-3 py-2 rounded-xl transition-all cursor-pointer"
            >
              Изменить
            </button>
          </template>

          <form v-else @submit.prevent="saveVkBinding" class="flex items-center space-x-2">
            <input
              v-model="vkInput"
              type="text"
              placeholder="id123456 или ник vk"
              required
              class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] font-mono w-44"
            />
            <button
              type="submit"
              :disabled="savingVk"
              class="btn-cyan text-xs px-3.5 py-2 rounded-xl font-bold transition-all disabled:opacity-40 flex items-center space-x-1 cursor-pointer"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>{{ savingVk ? '...' : 'Привязать' }}</span>
            </button>
            <button
              v-if="editingVk"
              type="button"
              @click="editingVk = false"
              class="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white px-2 py-1 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Direction Tabs with Apple Animated Liquid Glass Pill Dock -->
    <div class="mb-6 flex flex-wrap gap-2.5 items-center">
      <span class="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 uppercase tracking-wider text-[11px]">Цех:</span>
      <AnimatedPills
        v-model="selectedDirection"
        :items="directionTabs"
        variant="glass"
        size="sm"
      />
    </div>

    <!-- Materials Grid Transition -->
    <transition name="dept-swap" mode="out-in">
      <div v-if="loading" key="loading" class="text-center py-20 text-slate-500 dark:text-slate-400 text-xs">
        <div class="animate-spin w-8 h-8 border-2 border-orange-500 dark:border-[#fcb4d5] border-t-transparent rounded-full mx-auto mb-3"></div>
        Загрузка материалов...
      </div>

      <div v-else-if="materials.length === 0" key="empty" class="cyber-glass rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 max-w-md mx-auto border border-slate-200 dark:border-white/10">
        <div class="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-[#fcb4d5]/15 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5] mx-auto mb-4">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
        </div>
        <div class="text-sm font-extrabold text-slate-900 dark:text-white mb-1">Материалов не найдено</div>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          По выбранным фильтрам пока нет загруженных файлов или ссылок.
        </p>
      </div>

      <div v-else :key="'materials-' + selectedDirection" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="m in materials"
        :key="m.id"
        class="cyber-glass-card rounded-2xl p-5 flex flex-col justify-between border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-xl transition-all"
      >
        <div>
          <!-- Direction and Category -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-[10px] font-black px-2.5 py-0.5 rounded-xl uppercase tracking-wider bg-orange-50 dark:bg-[#fcb4d5]/15 text-orange-700 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30">
              {{ m.direction }}
            </span>
            <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-transparent">
              {{ m.category }}
            </span>
          </div>

          <!-- Title -->
          <h3 class="font-extrabold text-sm text-slate-900 dark:text-white mb-2 leading-snug">
            {{ m.title }}
          </h3>

          <!-- Description -->
          <p v-if="m.description" class="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed font-medium">
            {{ m.description }}
          </p>
        </div>

        <!-- Download Link & Delete -->
        <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
          <a
            :href="m.file_link"
            target="_blank"
            class="inline-flex items-center space-x-1.5 text-orange-700 dark:text-[#fcb4d5] hover:text-orange-800 dark:hover:text-white font-bold bg-orange-50 dark:bg-[#fcb4d5]/10 hover:bg-orange-100 dark:hover:bg-[#fcb4d5]/20 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-[#fcb4d5]/25 transition-all truncate"
          >
            <svg class="w-3.5 h-3.5 text-orange-600 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Скачать / Открыть</span>
            <span>↗</span>
          </a>

          <button
            v-if="isLeader"
            @click="deleteMaterial(m.id)"
            class="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all inline-flex items-center justify-center"
            title="Удалить"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    </transition>

    <!-- Upload Modal (Leadership only) -->
    <div v-if="showUploadModal" class="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div class="cyber-glass rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-white/60 dark:border-white/10 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center space-x-3 mb-2">
          <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-[#fcb4d5]/15 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <h3 class="text-lg font-black text-slate-900 dark:text-white">Добавить материал в базу</h3>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Файл будет доступен всем участникам выбранного направления.
        </p>

        <form @submit.prevent="submitUpload" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Название:</label>
            <input
              v-model="uploadForm.title"
              type="text"
              required
              placeholder="Логотип КЕДР (вектор)"
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Цех:</label>
              <select
                v-model="uploadForm.direction"
                required
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5]"
              >
                <option value="Фото">Фото</option>
                <option value="Дизайн">Дизайн</option>
                <option value="Видео">Видео</option>
                <option value="Моушен">Моушен</option>
                <option value="СММ">СММ</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Категория:</label>
              <input
                v-model="uploadForm.category"
                type="text"
                placeholder="Шаблоны"
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Файл с устройства:</label>
            <input
              type="file"
              ref="uploadFileInput"
              class="block w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-orange-500 dark:file:bg-[#fcb4d5] file:text-white dark:file:text-black border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-[#14141c] p-1"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Или ссылка на диск:</label>
            <input
              v-model="uploadForm.file_link"
              type="url"
              placeholder="https://drive.google.com/..."
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Описание (необязательно):</label>
            <textarea
              v-model="uploadForm.description"
              rows="2"
              class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white resize-none"
            ></textarea>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              @click="showUploadModal = false"
              class="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="uploading"
              class="btn-neon px-5 py-2.5 rounded-xl text-xs font-black disabled:opacity-40"
            >
              {{ uploading ? 'Загрузка...' : 'Загрузить' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import AnimatedPills from '../components/AnimatedPills.vue';

const authStore = useAuthStore();
const { user, isLeader, showNotification } = authStore;

const materials = ref([]);
const counts = ref({});
const totalCount = ref(0);
const selectedDirection = ref('');
const loading = ref(false);

const directionTabs = computed(() => [
  { label: 'Все', value: '', count: totalCount.value },
  { label: 'Фото', value: 'Фото', count: counts.value['Фото'] || 0 },
  { label: 'Дизайн', value: 'Дизайн', count: counts.value['Дизайн'] || 0 },
  { label: 'Видео', value: 'Видео', count: counts.value['Видео'] || 0 },
  { label: 'Моушен', value: 'Моушен', count: counts.value['Моушен'] || 0 },
  { label: 'СММ', value: 'СММ', count: counts.value['СММ'] || 0 }
]);

// VK Connection State
const vkInput = ref('');
const savingVk = ref(false);
const editingVk = ref(false);

const startEditVk = () => {
  editingVk.value = true;
  vkInput.value = user.value?.vk_id ? `id${user.value.vk_id}` : '';
};

const saveVkBinding = async () => {
  if (!user.value) return;
  savingVk.value = true;
  try {
    const res = await fetch(`/api/users/${user.value.id}/bind-vk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vk_id: vkInput.value })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('Профиль ВКонтакте успешно привязан!');
      authStore.user.vk_id = data.vk_id;
      editingVk.value = false;
    } else {
      showNotification(data.error || 'Ошибка привязки VK', 'error');
    }
  } catch (e) {
    showNotification('Ошибка связи с сервером', 'error');
  } finally {
    savingVk.value = false;
  }
};

const showUploadModal = ref(false);
const uploading = ref(false);
const uploadFileInput = ref(null);
const uploadForm = ref({
  title: '',
  direction: 'Дизайн',
  category: 'Материалы',
  file_link: '',
  description: ''
});

const fetchMaterials = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (selectedDirection.value) params.append('direction', selectedDirection.value);

    const res = await fetch(`/api/materials?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      materials.value = data.materials || [];
      counts.value = data.counts || {};
      totalCount.value = data.total_count || 0;
    }
  } catch (e) {
    console.error('Failed to load materials:', e);
  } finally {
    loading.value = false;
  }
};

watch(selectedDirection, () => {
  fetchMaterials();
});

const submitUpload = async () => {
  const file = uploadFileInput.value?.files[0];
  if (!file && !uploadForm.value.file_link.trim()) {
    alert('Прикрепите файл или укажите внешнюю ссылку.');
    return;
  }

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('title', uploadForm.value.title);
    formData.append('direction', uploadForm.value.direction);
    formData.append('category', uploadForm.value.category);
    if (uploadForm.value.description) {
      formData.append('description', uploadForm.value.description);
    }
    if (file) {
      formData.append('file_upload', file);
    }
    if (uploadForm.value.file_link.trim()) {
      formData.append('file_link', uploadForm.value.file_link.trim());
    }

    const res = await fetch('/api/materials', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('Материал успешно загружен в базу!');
      showUploadModal.value = false;
      uploadForm.value.title = '';
      uploadForm.value.file_link = '';
      uploadForm.value.description = '';
      await fetchMaterials();
    } else {
      alert(data.error || 'Ошибка загрузки');
    }
  } catch (e) {
    alert('Сетевая ошибка при загрузке');
  } finally {
    uploading.value = false;
  }
};

const deleteMaterial = async (id) => {
  if (!confirm('Удалить этот рабочий материал из базы?')) return;
  try {
    const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showNotification('Материал удален.');
      await fetchMaterials();
    }
  } catch (e) {}
};

onMounted(() => {
  fetchMaterials();
});
</script>
