# Gamedev

Рабочая папка для разработки игр и связанных учебных материалов.

## Активный проект

Сейчас основной проект — 2D-аркада **«Лесной светлячок»** на Godot 4.

- [Проект Godot](godot/forest_firefly/)
- [Game Design Document](godot/forest_firefly/GDD.md)
- [План разработки](godot/forest_firefly/Tasks.md)
- [Идеи после MVP](godot/forest_firefly/Идеи.md)

Актуальные требования к игре находятся в `godot/forest_firefly/GDD.md`. Задачи следует выполнять по порядку из `godot/forest_firefly/Tasks.md`.

Папка `godot/` предназначена для нескольких независимых проектов. Каждый новый проект следует создавать в собственной подпапке.

## Документация

Материалы в `docs/` являются справочными и не определяют требования к активному проекту.

### Руководства

- [Использование нейросети при создании игры в Godot](docs/guides/ai_in_godot_game_development.md)
- [Создание 2D-игры в Godot: практический путь](docs/guides/godot_game_dev_guide.md)
- [Godot: погружение в разработку игр](docs/guides/godot_put_razrabotchika_igr.md)

### Концепции игр

- [Идеи игр в стиле «100 испытаний»](docs/concepts/idei_100_ispytaniy.md)
- [Игры про эволюцию и развитие цивилизации](docs/concepts/idei_2d_igry_evolyuciya.md)
- [Ранние концепции «Лесного светлячка» и «Маленького планетохода»](docs/concepts/idei_lesnoy_svetlyachok_i_planeto.md)

### Альтернативные технологии

- [Путь разработчика 2D-игры на Phaser](docs/alternatives/phaser_put_razrabotchika_igr.md)

## Структура

```text
gamedev/
├── README.md
├── godot/               # проекты на Godot
│   └── forest_firefly/  # активный проект «Лесной светлячок»
└── docs/
    ├── guides/          # учебные руководства
    ├── concepts/        # ранние и альтернативные идеи игр
    └── alternatives/    # другие технологии разработки
```
