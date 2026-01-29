# Webserver 子目录

# 添加 app 子目录
add_subdirectory(app)

# 添加 common 子目录
add_subdirectory(common)

# 添加 net 子目录
add_subdirectory(net)

# 将收集的变量传递到父作用域
set(ALL_SOURCES ${ALL_SOURCES} PARENT_SCOPE)
set(ALL_INCLUDE_DIRS ${ALL_INCLUDE_DIRS} PARENT_SCOPE)
