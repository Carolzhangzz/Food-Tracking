# 游戏逻辑需求文档

## 📋 NPC对话逻辑

### 1. NPC解锁规则

- **第一天**：只能与第1个NPC对话
- **第二天及以后**：解锁下一个NPC的条件：
  - 已过了1天（基于首次登录时间）
  - **前一个NPC对话过程中至少记录了一顿饭**
  
- **无法解锁条件**：如果玩家和某NPC一餐都没有记录，就无法解锁下一个NPC，需要重新与当前NPC对话

### 2. 对话流程

#### Step 1: 开场白（ConvAI API）
- 调用后端ConvAI API接口
- 每个NPC有固定的开场白
- 识别到开场白结束标志

#### Step 2: 选择餐食
- 系统提问：`"Which meal do you want to record?"`
- 玩家选择：
  - Breakfast（早餐）
  - Lunch（午餐）
  - Dinner（晚餐）

#### Step 3: Food Journaling（Groq API）
- 调用写好的Groq API
- AI与玩家进行food journaling对话
- 询问关于食物的细节问题

#### Step 4: 结束判断
- 检测NPC说出：`"Thanks for sharing your meal with me."`
- 根据记录的餐食类型给出不同回复

### 3. 线索给予逻辑

#### 情况A：晚餐（Dinner）
- ✅ **给予线索对话**
- 线索会记录到线索本
- 线索内容：关于下一个NPC对话的提示

#### 情况B：非晚餐（Breakfast/Lunch）
- ❌ **给予模糊回复（vague response）**

**第一次非晚餐记录：**
```
"It's nice hearing you share in such detail. I miss talking to Chef Hua about all things food, and all the little ingredients that make a dish special.

I'll still be here till your next meal, so come back after that. Maybe then, the pieces will make more sense."
```

**第二次非晚餐记录：**
```
"I keep trying to remember exactly what he said about the greenwood seeds. It's right on the tip of my tongue."
```

### 4. 线索存储

- **存储位置**：线索本（Clue Notebook）
- **存储内容**：
  - NPC ID
  - NPC名称
  - 线索文本（可适当缩短，提取关键词）
  - 天数（Day）
  - 时间戳
- **查看方式**：点击左下角📋按钮

---

## 🗄️ PostgreSQL 数据库设计

### 表1: `players` - 玩家信息表

```sql
CREATE TABLE players (
    player_id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    nickname VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    music BOOLEAN DEFAULT TRUE,
    gender VARCHAR(10),
    first_login_date TIMESTAMP NOT NULL,
    last_login_date TIMESTAMP,
    current_day INTEGER DEFAULT 1,
    game_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**说明**：
- `player_id`：游戏前分配，只有数据库存在的ID才能登录
- `first_login_date`：首次登录时间，用于判断天数
- `current_day`：当前可对话的NPC天数

### 表2: `conversations` - 对话记录表

```sql
CREATE TABLE conversations (
    conversation_id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES players(player_id),
    npc_id VARCHAR(50) NOT NULL,
    day INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'player' or 'npc'
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player_npc (player_id, npc_id, day)
);
```

**说明**：
- 存储玩家和NPC的所有对话
- `role`：区分是玩家还是NPC说的话
- 可追溯完整对话历史

### 表3: `meal_records` - 餐食记录表

```sql
CREATE TABLE meal_records (
    meal_id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES players(player_id),
    npc_id VARCHAR(50) NOT NULL,
    day INTEGER NOT NULL,
    meal_type VARCHAR(20) NOT NULL, -- 'breakfast', 'lunch', 'dinner'
    food_items TEXT NOT NULL, -- JSON格式存储食物清单
    details TEXT, -- 玩家描述的细节
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player_day (player_id, day)
);
```

**说明**：
- 存储每次food journaling的内容
- `food_items`：JSON格式，例如：`["rice", "chicken", "vegetables"]`
- `details`：玩家的详细描述
- 用于判断是否解锁下一个NPC

### 表4: `clues` - 线索表（预设）

```sql
CREATE TABLE clues (
    clue_id SERIAL PRIMARY KEY,
    npc_id VARCHAR(50) NOT NULL,
    day INTEGER NOT NULL,
    clue_type VARCHAR(20) NOT NULL, -- 'clue' or 'vague'
    clue_text_en TEXT NOT NULL,
    clue_text_zh TEXT NOT NULL,
    order_number INTEGER, -- vague回复的次序（第1次、第2次）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**说明**：
- 存储NPC的固定线索和vague回复
- `clue_type`：区分是真实线索还是模糊回复
- `order_number`：用于vague回复的次序判断

### 表5: `player_clues` - 玩家获得的线索表

```sql
CREATE TABLE player_clues (
    player_clue_id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES players(player_id),
    npc_id VARCHAR(50) NOT NULL,
    day INTEGER NOT NULL,
    clue_id INTEGER REFERENCES clues(clue_id),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player_day (player_id, day)
);
```

**说明**：
- 记录玩家实际获得的线索
- 与`clues`表关联
- 在线索本中显示

### 表6: `final_reports` - 最终报告表

```sql
CREATE TABLE final_reports (
    report_id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES players(player_id) UNIQUE,
    report_content TEXT NOT NULL, -- LLM生成的报告
    language VARCHAR(10) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**说明**：
- 游戏完成后，将所有餐食记录发给LLM
- LLM生成一个合理的健康/饮食报告
- 每个玩家只有一份最终报告

---

## 🔄 业务逻辑流程

### 登录逻辑

```
1. 玩家输入player_id
2. 查询players表，验证ID是否存在
3. 如果存在：
   - 更新last_login_date
   - 计算天数差：current_day = DAYS_DIFF(NOW(), first_login_date) + 1
   - 查询meal_records判断可对话的NPC
4. 如果不存在：拒绝登录
```

### NPC解锁判断

```python
def can_talk_to_npc(player_id, npc_day):
    # 1. 检查天数
    player = get_player(player_id)
    days_passed = (datetime.now() - player.first_login_date).days + 1
    
    if npc_day > days_passed:
        return False, "还没到那一天"
    
    # 2. 检查前一天是否有餐食记录
    if npc_day > 1:
        prev_day_meals = get_meals_for_day(player_id, npc_day - 1)
        if len(prev_day_meals) == 0:
            return False, "需要先记录前一天的餐食"
    
    return True, "可以对话"
```

### 线索给予判断

```python
def give_clue_or_vague(player_id, npc_id, meal_type):
    if meal_type == 'dinner':
        # 给予真实线索
        clue = get_clue(npc_id, clue_type='clue')
        save_player_clue(player_id, clue)
        return clue.text
    else:
        # 给予模糊回复
        vague_count = count_vague_responses(player_id, npc_id)
        order = min(vague_count + 1, 2)  # 最多2次
        vague = get_clue(npc_id, clue_type='vague', order=order)
        return vague.text
```

---

## 📱 前端显示需求

### 地图界面
- ✅ 7个NPC全部显示
- ✅ 第1个NPC：高亮/箭头指示（可对话）
- ✅ 其他NPC：灰色/锁定图标（未解锁）
- ✅ 点击移动功能
- ✅ 左下角：线索本按钮📋
- ✅ 右上角：语言/音乐按钮

### 线索本界面
- 显示所有获得的线索
- 按天数排序
- 显示NPC名称和线索内容
- 支持滚动查看
- 点击关闭按钮返回

### 对话界面
- NPC头像：左上角
- 背景图：对应NPC的background图（`npc1bg.png`等）
- 对话框：底部
- 玩家输入框：底部
- 选择餐食按钮：Breakfast / Lunch / Dinner

---

## 🔌 后端API需求

### 1. ConvAI API（开场白）
```
POST /api/convai/start-conversation
Body: {
    player_id: string,
    npc_id: string,
    language: 'en' | 'zh'
}
Response: {
    conversation_id: string,
    opening_message: string
}
```

### 2. Groq API（Food Journaling）
```
POST /api/groq/food-journal
Body: {
    player_id: string,
    npc_id: string,
    meal_type: 'breakfast' | 'lunch' | 'dinner',
    user_message: string,
    language: 'en' | 'zh'
}
Response: {
    npc_response: string,
    is_complete: boolean,
    food_items: string[] (if complete)
}
```

### 3. 腾讯翻译API
```
POST /api/translate
Body: {
    text: string,
    from: 'en' | 'zh',
    to: 'en' | 'zh'
}
Response: {
    translated_text: string
}
```

### 4. 线索API
```
GET /api/clues/:player_id
Response: {
    clues: [
        {
            npc_id: string,
            npc_name: string,
            day: number,
            clue_text: string,
            received_at: timestamp
        }
    ]
}
```

### 5. 最终报告API
```
POST /api/generate-final-report
Body: {
    player_id: string,
    language: 'en' | 'zh'
}
Response: {
    report_content: string
}
```

---

## 🎵 音乐需求

- **登录页面**：舒缓的背景音乐
- **主界面**：神秘的探索音乐
- **开场动画**：史诗感的音乐
- **地图界面**：轻松的村庄音乐
- **对话界面**：
  - NPC1：温暖的音乐
  - NPC2：正式的音乐
  - NPC3：神秘的音乐
  - NPC4-7：各有特色
- **线索本**：思考的音乐

**实现方式**：
- 使用`audioManager.js`管理音乐
- 场景切换时自动切换音乐
- 支持音量控制和静音

---

## ✅ 开发优先级

### 第一阶段（当前）
1. ✅ 地图显示和NPC定位
2. ✅ 点击移动功能
3. ✅ 线索本UI
4. ✅ 语言和音乐控制

### 第二阶段（下一步）
1. 🔲 数据库表设计和创建
2. 🔲 后端API开发（ConvAI + Groq）
3. 🔲 NPC解锁判断逻辑
4. 🔲 对话界面开发

### 第三阶段
1. 🔲 Food Journaling流程
2. 🔲 线索给予逻辑
3. 🔲 线索本功能完善
4. 🔲 餐食记录保存

### 第四阶段
1. 🔲 最终报告生成
2. 🔲 音乐系统完善
3. 🔲 多语言支持（腾讯翻译）
4. 🔲 游戏完成流程

---

## 📝 注意事项

1. **天数计算**：基于`first_login_date`，不是每次登录都增加天数
2. **餐食记录**：每个NPC至少需要1顿餐，建议提示玩家记录晚餐（可获得线索）
3. **线索关键词**：适当缩短，提取关键信息，不要存储完整对话
4. **翻译API**：只在Groq等API返回英文且玩家选择中文时调用，避免过度翻译
5. **对话历史**：完整保存，用于调试和分析玩家行为
6. **性能优化**：对话记录可能很长，查询时注意分页和索引

---

**文档创建时间**：2025-12-24  
**最后更新**：2025-12-24  
**状态**：设计阶段

