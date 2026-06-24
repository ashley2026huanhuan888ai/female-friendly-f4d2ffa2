# Hero 操作区左对齐并收窄

`src/routes/index.tsx`：

- 第 106 行 form className：
  - 由 `mx-auto mt-8 flex w-full max-w-sm border border-foreground md:mx-0 md:mt-10 md:max-w-lg`
  - 改为 `mt-8 flex w-full max-w-md border border-foreground md:mt-10 md:max-w-lg`

- 第 118 行按钮行 className：
  - 由 `mt-6 flex flex-wrap justify-center gap-3 md:justify-start`
  - 改为 `mt-6 flex max-w-md flex-wrap gap-3`

效果：搜索框与三个 CTA 在移动端均左对齐，宽度收到正文同级（max-w-md），右侧留白。
