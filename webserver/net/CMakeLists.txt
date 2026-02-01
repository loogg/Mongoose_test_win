# Net 源文件

# 收集当前目录的源文件
file(GLOB SRCS ${CMAKE_CURRENT_SOURCE_DIR}/*.c)

# 如果没有定义 MG_ENABLE_PACKED_FS，则排除 packedfs.c
if(NOT DEFINED MG_ENABLE_PACKED_FS)
    list(FILTER SRCS EXCLUDE REGEX ".*packedfs\\.c$")
endif()

# 将源文件添加到父作用域变量
set(ALL_SOURCES ${ALL_SOURCES} ${SRCS} PARENT_SCOPE)

# 添加头文件路径
set(ALL_INCLUDE_DIRS ${ALL_INCLUDE_DIRS} ${CMAKE_CURRENT_SOURCE_DIR} PARENT_SCOPE)
