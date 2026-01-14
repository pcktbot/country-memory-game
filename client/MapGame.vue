<template>
  <div id="app-wrapper" class="wrapper">
    <div ref="mapContainer" class="container">
      <div ref="mapWrapper" class="map-wrapper" />
    </div>

    <div id="scoreboard" class="scoreboard">
      <div v-if="gameCompleted" class="prompt prompt-complete">
        <h2 class="prompt-value">{{ completedLabel }}</h2>
        <p class="prompt-subtitle">Final score: {{ score }} / {{ totalAttempts }}</p>
      </div>
      <template v-else-if="currentItem">
        <div class="prompt">
          <h2 class="prompt-value">
            <span v-if="showFlag && currentItem.flag" class="prompt-flag">{{ currentItem.flag }}</span>
            <span class="prompt-name">{{ currentItem.name }}</span>
          </h2>
        </div>
        <div class="buttons">
          <button @click="nextItem" class="button">
            Skip
          </button>
          <button @click="highlightCurrentItem" class="button">
            Highlight
          </button>
        </div>
      </template>

      <div class="border">
        <div ref="scoreElement" class="score-section" id="score">
          <div class="score-title">Score</div>
          <div class="score-value">{{ score }}</div>
        </div>
        <div class="score-section">
          <div class="score-title">Total</div>
          <div class="score-value">{{ totalAttempts }}</div>
        </div>
      </div>
    </div>

    <div v-if="feedback" class="feedback">
      <div :class="[
        'px-8 py-4 rounded-lg text-lg font-medium shadow-lg animate-fadeIn',
        feedbackType === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      ]">
        {{ feedback }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Panzoom from '@panzoom/panzoom';

interface MapItem {
  id: string;
  name: string;
  flag?: string | null;
}

const props = defineProps<{
  items: MapItem[];
  mapUrl: string;
  completedLabel: string;
  showFlag?: boolean;
}>();

const showFlag = computed(() => props.showFlag !== false);

const score = ref(0);
const totalAttempts = ref(0);
const currentItem = ref<MapItem | null>(null);
const feedback = ref('');
const feedbackType = ref<'correct' | 'incorrect'>('correct');
const mapWrapper = ref<HTMLDivElement | null>(null);
const mapContainer = ref<HTMLDivElement | null>(null);
const scoreElement = ref<HTMLDivElement | null>(null);
const gameCompleted = ref(false);
const foundItemIds = ref<Set<string>>(new Set());
const usedItemIds = ref<Set<string>>(new Set());

let panzoomInstance: any = null;
let svgElement: SVGElement | null = null;
let didDrag = false;
let pointerActive = false;
let dragStartX = 0;
let dragStartY = 0;
let scoreFlashTimeout: number | null = null;
let scoreIncorrectFlashTimeout: number | null = null;
let highlightTimeout: number | null = null;
let onPointerDown: ((event: PointerEvent) => void) | null = null;
let onPointerMove: ((event: PointerEvent) => void) | null = null;
let onPointerUp: ((event?: PointerEvent) => void) | null = null;
let onSvgClick: ((event: MouseEvent) => void) | null = null;
let onWheel: ((event: WheelEvent) => void) | null = null;

onMounted(async () => {
  await loadMap();
  nextItem();
});

onUnmounted(() => {
  if (panzoomInstance) {
    panzoomInstance.destroy();
  }
  if (scoreFlashTimeout !== null) {
    window.clearTimeout(scoreFlashTimeout);
  }
  if (scoreIncorrectFlashTimeout !== null) {
    window.clearTimeout(scoreIncorrectFlashTimeout);
  }
  if (highlightTimeout !== null) {
    window.clearTimeout(highlightTimeout);
  }
  if (svgElement) {
    if (onPointerDown) {
      svgElement.removeEventListener('pointerdown', onPointerDown);
    }
    if (onPointerMove) {
      svgElement.removeEventListener('pointermove', onPointerMove);
    }
    if (onPointerUp) {
      svgElement.removeEventListener('pointerup', onPointerUp);
      svgElement.removeEventListener('pointercancel', onPointerUp);
    }
    if (onSvgClick) {
      svgElement.removeEventListener('click', onSvgClick, true);
    }
  }
  if (onPointerUp) {
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  }
  if (mapWrapper.value && onWheel) {
    mapWrapper.value.removeEventListener('wheel', onWheel);
  }
});

const escapeSelector = (value: string) => {
  if (typeof CSS !== 'undefined' && 'escape' in CSS) {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
};

const getItemPaths = (item: MapItem): SVGPathElement[] => {
  if (!svgElement) {
    return [];
  }
  const id = escapeSelector(item.id);
  const name = escapeSelector(item.name);
  const selectors = [
    `path[id="${id}"]`,
    `path[data-id="${id}"]`,
    `path[data-country="${id}"]`,
    `path[data-name="${name}"]`,
    `path[data-country="${name}"]`,
    `path[data-id="${name}"]`
  ];
  return Array.from(svgElement.querySelectorAll(selectors.join(','))) as SVGPathElement[];
};

const setItemFill = (item: MapItem, color: string) => {
  getItemPaths(item).forEach(path => {
    path.style.fill = color;
  });
};

const flashScore = () => {
  const element = scoreElement.value;
  if (!element) {
    return;
  }
  element.classList.add('correct');
  if (scoreFlashTimeout !== null) {
    window.clearTimeout(scoreFlashTimeout);
  }
  scoreFlashTimeout = window.setTimeout(() => {
    element.classList.remove('correct');
    scoreFlashTimeout = null;
  }, 1000);
};

const flashScoreIncorrect = () => {
  const element = scoreElement.value;
  if (!element) {
    return;
  }
  element.classList.add('incorrect');
  if (scoreIncorrectFlashTimeout !== null) {
    window.clearTimeout(scoreIncorrectFlashTimeout);
  }
  scoreIncorrectFlashTimeout = window.setTimeout(() => {
    element.classList.remove('incorrect');
    scoreIncorrectFlashTimeout = null;
  }, 1000);
};

const highlightCurrentItem = () => {
  if (!currentItem.value) {
    return;
  }
  const item = currentItem.value;
  setItemFill(item, '#F19A3E');
  if (highlightTimeout !== null) {
    window.clearTimeout(highlightTimeout);
  }
  highlightTimeout = window.setTimeout(() => {
    const isFound = foundItemIds.value.has(item.id);
    setItemFill(item, isFound ? 'var(--found-country-fill)' : '#e0e0e0');
    highlightTimeout = null;
  }, 800);
};

const findItemByElement = (element: SVGElement): MapItem | null => {
  const path = element.closest('path') as SVGPathElement | null;
  const target = path ?? element;
  const id = target.getAttribute('id')?.trim() ?? '';
  const dataId = target.getAttribute('data-id')?.trim() ?? '';
  const dataCountry = target.getAttribute('data-country')?.trim() ?? '';
  const dataName = target.getAttribute('data-name')?.trim() ?? '';

  const candidates = new Set([id, dataId, dataCountry, dataName].filter(Boolean));
  if (candidates.size === 0) {
    return null;
  }

  return props.items.find(item => (
    candidates.has(item.id) ||
    candidates.has(item.name)
  )) ?? null;
};

const loadMap = async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${props.mapUrl}`);
    const svgText = await response.text();

    if (mapWrapper.value) {
      mapWrapper.value.innerHTML = svgText;
      svgElement = mapWrapper.value.querySelector('svg');

      if (svgElement) {
        const viewBox = svgElement.getAttribute('viewBox');
        const [, , vbWidth, vbHeight] = viewBox ? viewBox.split(' ').map(Number) : [0, 0, 2000, 1000];

        const aspectRatio = vbWidth / vbHeight;
        const viewportAspect = window.innerWidth / window.innerHeight;

        let width, height;
        if (aspectRatio > viewportAspect) {
          height = window.innerHeight;
          width = height * aspectRatio;
        } else {
          width = window.innerWidth;
          height = width / aspectRatio;
        }

        svgElement.style.width = `${width}px`;
        svgElement.style.height = `${height}px`;
        svgElement.style.cursor = 'grab';
        svgElement.style.display = 'block';

        const paths = svgElement.querySelectorAll('path');
        paths.forEach(path => {
          path.style.fill = '#e0e0e0';
          path.style.stroke = '#ffffff';
          path.style.strokeWidth = '0.5';
          path.style.transition = 'fill 0.2s';
          path.style.cursor = 'pointer';

          path.addEventListener('mouseenter', () => {
            const item = findItemByElement(path as unknown as SVGElement);
            const isFound = item ? foundItemIds.value.has(item.id) : false;
            if (item && !isFound) {
              setItemFill(item, '#bdbdbd');
            }
          });

          path.addEventListener('mouseleave', () => {
            const item = findItemByElement(path as unknown as SVGElement);
            const isFound = item ? foundItemIds.value.has(item.id) : false;
            if (item) {
              setItemFill(item, isFound ? 'var(--found-country-fill)' : '#e0e0e0');
            }
          });

          path.addEventListener('click', handleItemClick);
        });

        onPointerDown = (event: PointerEvent) => {
          pointerActive = true;
          didDrag = false;
          dragStartX = event.clientX;
          dragStartY = event.clientY;
        };

        onPointerMove = (event: PointerEvent) => {
          if (!pointerActive) {
            return;
          }
          const deltaX = Math.abs(event.clientX - dragStartX);
          const deltaY = Math.abs(event.clientY - dragStartY);
          if (deltaX > 5 || deltaY > 5) {
            didDrag = true;
          }
        };

        onPointerUp = () => {
          pointerActive = false;
        };

        svgElement.addEventListener('pointerdown', onPointerDown);
        svgElement.addEventListener('pointermove', onPointerMove);
        svgElement.addEventListener('pointerup', onPointerUp);
        svgElement.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);

        onSvgClick = (event: MouseEvent) => {
          if (didDrag) {
            event.stopPropagation();
            event.preventDefault();
            didDrag = false;
          }
        };

        svgElement.addEventListener('click', onSvgClick, true);

        panzoomInstance = Panzoom(svgElement, {
          maxScale: 12,
          minScale: 1,
          cursor: 'grab',
          canvas: true,
          animate: true,
          duration: 300,
          easing: 'ease-in-out'
        });

        if (mapWrapper.value) {
          onWheel = (event: WheelEvent) => {
            if (panzoomInstance) {
              panzoomInstance.zoomWithWheel(event, {
                step: 0.1
              });
            }
          };
          mapWrapper.value.addEventListener('wheel', onWheel);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load map:', error);
  }
};

const handleItemClick = (event: Event) => {
  if (didDrag) {
    return;
  }

  event.stopPropagation();
  const target = event.target as SVGElement;

  const clickedItem = findItemByElement(target);

  if (!clickedItem) {
    return;
  }

  totalAttempts.value++;

  if (clickedItem.id === currentItem.value?.id) {
    score.value++;
    flashScore();
    feedback.value = `Correct! That's ${currentItem.value.name}!`;
    feedbackType.value = 'correct';

    foundItemIds.value.add(clickedItem.id);

    setItemFill(clickedItem, '#85CB33');
    setTimeout(() => {
      setItemFill(clickedItem, 'var(--found-country-fill)');
    }, 300);
    setTimeout(() => {
      nextItem();
    }, 1500);
  } else {
    flashScoreIncorrect();
    feedback.value = `Try again! That's ${clickedItem.name}.`;
    feedbackType.value = 'incorrect';

    setItemFill(clickedItem, '#f44336');
    setTimeout(() => {
      const isFound = foundItemIds.value.has(clickedItem.id);
      setItemFill(clickedItem, isFound ? 'var(--found-country-fill)' : '#e0e0e0');
    }, 300);
    setTimeout(() => {
      feedback.value = '';
    }, 1500);
  }
};

const nextItem = () => {
  feedback.value = '';
  const remaining = props.items.filter(item => !foundItemIds.value.has(item.id));
  if (remaining.length === 0) {
    gameCompleted.value = true;
    currentItem.value = null;
    return;
  }
  let available = remaining.filter(item => !usedItemIds.value.has(item.id));
  if (available.length === 0) {
    usedItemIds.value = new Set();
    available = remaining;
  }
  const next = available[Math.floor(Math.random() * available.length)];
  currentItem.value = next;
  usedItemIds.value.add(next.id);
};
</script>

<style>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
</style>
