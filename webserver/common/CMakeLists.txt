# Common 子目录

# 添加 mongoose 子目录
add_subdirectory(mongoose)

# 将收集的变量传递到父作用域
set(ALL_SOURCES ${ALL_SOURCES} PARENT_SCOPE)
set(ALL_INCLUDE_DIRS ${ALL_INCLUDE_DIRS} PARENT_SCOPE)
