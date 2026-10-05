// v15 全链路无头测试验证脚本
import { ITEM_DEFS } from '../src/game/constants';
import { generateWorld, getBiomeAt } from '../src/game/worldGen';
import { GameEngine } from '../src/game/engine';
import { sounds } from '../src/game/audio';

function runTests() {
  console.log('=== 开始执行 v15 功能验证 ===');

  // 1. 验证物品图标与定义
  console.log('1. 验证物品图标与新增定义...');
  if (ITEM_DEFS.torch.icon === '🔦') {
    throw new Error('FAIL: 火把依然是手电筒图标！');
  }
  console.log(`✓ 火把图标已优化为: ${ITEM_DEFS.torch.icon}`);

  const icons = [
    ITEM_DEFS.copper_ore.icon,
    ITEM_DEFS.tin_ore.icon,
    ITEM_DEFS.iron_ore.icon,
    ITEM_DEFS.silver_ore.icon,
    ITEM_DEFS.blackmetal_ore.icon,
  ];
  const uniqueIcons = new Set(icons);
  if (uniqueIcons.size !== icons.length) {
    throw new Error(`FAIL: 矿物图标存在重复: ${icons.join(', ')}`);
  }
  console.log(`✓ 五大矿石图标完全差异化: ${icons.join(' ')}`);

  if (!ITEM_DEFS.elder_seal || ITEM_DEFS.elder_seal.type !== 'consumable') {
    throw new Error('FAIL: elder_seal 未正确定义');
  }
  if (!ITEM_DEFS.elder_heart || ITEM_DEFS.elder_heart.type !== 'material') {
    throw new Error('FAIL: elder_heart 未正确定义');
  }
  console.log(`✓ 古树封印物与树心印记定义正常: ${ITEM_DEFS.elder_seal.name} (${ITEM_DEFS.elder_seal.icon}), ${ITEM_DEFS.elder_heart.name} (${ITEM_DEFS.elder_heart.icon})`);

  // 2. 验证音频接口与BGM
  console.log('2. 验证背景音乐与音效接口...');
  if (
    typeof sounds.startBgm !== 'function' ||
    typeof sounds.stopBgm !== 'function' ||
    typeof sounds.toggleBgm !== 'function' ||
    typeof sounds.playRootSpike !== 'function' ||
    typeof sounds.playVineShot !== 'function' ||
    typeof sounds.playMagicSpell !== 'function'
  ) {
    throw new Error('FAIL: sounds 缺少 v15 音频方法');
  }
  console.log('✓ BGM 与三首领音效接口就绪');

  // 3. 验证黑暗林山与遗迹村庄世界生成
  console.log('3. 验证黑暗林山群系与遗迹村庄生成...');
  const world = generateWorld();
  console.log(`✓ 地形生成尺寸: ${world.tiles.length} x ${world.tiles[0].length}`);

  const biomeMeadow = getBiomeAt(120);
  const biomeForestLeft = getBiomeAt(30);
  const biomeForestRight = getBiomeAt(190);
  if (biomeMeadow !== 'meadows') throw new Error(`FAIL: x=120 应该是草原，实际: ${biomeMeadow}`);
  if (biomeForestLeft !== 'black_forest') throw new Error(`FAIL: x=30 应该是黑暗林山，实际: ${biomeForestLeft}`);
  if (biomeForestRight !== 'black_forest') throw new Error(`FAIL: x=190 应该是黑暗林山，实际: ${biomeForestRight}`);
  console.log('✓ 群系判定正常: x=120 青青草原, x=30/190 黑暗林山');

  if (world.ruinedVillageChests.length < 2) {
    throw new Error(`FAIL: 遗迹村庄宝箱数量不足: ${world.ruinedVillageChests.length}`);
  }
  console.log(`✓ 遗迹村庄宝箱坐标: ${JSON.stringify(world.ruinedVillageChests)}`);

  if (world.dwarfShamanSpawns.length < 2) {
    throw new Error(`FAIL: 矮人萨满刷新点不足: ${world.dwarfShamanSpawns.length}`);
  }
  console.log(`✓ 灰矮人萨满刷新坐标: ${JSON.stringify(world.dwarfShamanSpawns)}`);

  // 4. 模拟 GameEngine
  console.log('4. 模拟游戏引擎运行时与双Boss机制...');
  // Mock Web Storage & Window Audio
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  (globalThis as any).AudioContext = class {
    currentTime = 0;
    createGain() {
      return {
        connect: () => {},
        gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      };
    }
    createOscillator() {
      return {
        connect: () => {},
        start: () => {},
        stop: () => {},
        frequency: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      };
    }
    createBiquadFilter() {
      return {
        connect: () => {},
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
      };
    }
    createBuffer() {
      return {
        getChannelData: () => new Float32Array(100),
      };
    }
    createBufferSource() {
      return {
        connect: () => {},
        start: () => {},
        stop: () => {},
        buffer: null,
      };
    }
    destination = {};
    state = 'running';
    resume() { return Promise.resolve(); }
  };
  (globalThis as any).webkitAudioContext = (globalThis as any).AudioContext;

  const engine = new GameEngine();
  engine.initNewWorld();

  // 检查初始灵鹿与村庄矮人萨满
  const shamans = engine.monsters.filter((m) => m.monsterId === 'dwarf_shaman');
  if (shamans.length < 2) {
    throw new Error(`FAIL: 引擎未正确初始化萨满怪物，实际数量: ${shamans.length}`);
  }
  console.log(`✓ 灰矮人萨满已驻守遗迹村庄 (共 ${shamans.length} 名)`);

  // 击败矮人萨满获得古树封印物
  const shaman = shamans[0];
  shaman.hp = 0;
  shaman.alive = false;
  (engine as any).handleMonsterDeath(shaman);
  const drops = engine.drops;
  const sealDrop = drops.find((d) => d.itemId === 'elder_seal');
  if (!sealDrop) {
    throw new Error('FAIL: 击败萨满后未掉落 elder_seal！');
  }
  console.log(`✓ 击败灰矮人萨满成功掉落【古树封印物】`);

  // 拾取古树封印物到快捷栏
  engine.inventory[0] = { itemId: 'elder_seal', count: 1 };
  engine.stats.selectedSlot = 0;

  // 使用封印物召唤古树长老
  const summonedElder = engine.consumeItem(0);
  if (!summonedElder) {
    throw new Error('FAIL: 使用 elder_seal 召唤古树长老失败');
  }
  const elder = engine.getActiveBoss();
  if (!elder || elder.monsterId !== 'the_elder') {
    throw new Error('FAIL: 激活的Boss不是 the_elder');
  }
  console.log(`✓ 成功召唤古树长老·高姆！生命值: ${elder.hp}/${elder.maxHp}`);

  // 验证古树长老不能重复召唤
  engine.inventory[0] = { itemId: 'elder_seal', count: 1 };
  const doubleSummon = engine.consumeItem(0);
  if (doubleSummon) {
    throw new Error('FAIL: 允许重复召唤Boss！');
  }
  console.log('✓ 防止重复召唤机制生效');

  // 击败古树长老掉落古树心印记
  elder.hp = 0;
  elder.alive = false;
  (engine as any).handleMonsterDeath(elder);
  const heartDrop = engine.drops.find((d) => d.itemId === 'elder_heart');
  if (!heartDrop) {
    throw new Error('FAIL: 击败古树长老未掉落 elder_heart！');
  }
  console.log(`✓ 击败古树长老成功掉落【远古树心印记】！`);

  // 测试赤血灵鹿召唤与速度
  engine.inventory[0] = { itemId: 'eikthyr_summon', count: 1 };
  const summonedEikthyr = engine.consumeItem(0);
  if (!summonedEikthyr) {
    throw new Error('FAIL: 召唤赤血灵鹿失败');
  }
  const eikthyr = engine.getActiveBoss();
  if (!eikthyr || eikthyr.monsterId !== 'eikthyr') {
    throw new Error('FAIL: 激活Boss不是 eikthyr');
  }
  console.log(`✓ 成功召唤赤血灵鹿！移速设定: ${eikthyr.speed} (玩家基准移速: 160)`);
  if (eikthyr.speed >= 160) {
    throw new Error(`FAIL: 灵鹿移速 ${eikthyr.speed} 未低于玩家速度 160！`);
  }

  // 测试遗迹宝箱拾取
  const chestKeys = Object.keys(engine.chests);
  if (chestKeys.length === 0) {
    throw new Error('FAIL: 遗迹村庄宝箱未正确预置物资');
  }
  const sampleChest = engine.chests[chestKeys[0]];
  console.log(`✓ 遗迹村庄宝箱正常生成物资: ${sampleChest.filter(Boolean).map((s) => s?.itemId).join(', ')}`);

  console.log('=== 全部测试项顺利通过 ✓ ===');
}

runTests();
