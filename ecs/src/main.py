import sys

import build
import deploy
import ecs
import oam


def main():
    # 根据 ./res/config.toml 创建虚拟机
    if sys.argv[1] == "ecs_make":
        ecs.make()
    # 删除全部虚拟机
    if sys.argv[1] == "ecs_free":
        ecs.free()
    # 构建 muta docker 镜像
    if sys.argv[1] == "build_muta_docker":
        build.muta_docker()
    # 构建 muta binary
    if sys.argv[1] == "build_muta_binary":
        build.muta_binary()
    # 构建 muta config 的资源创建请求
    if sys.argv[1] == "build_muta_config_request":
        build.muta_config_request()
    # 构建 muta config
    if sys.argv[1] == "build_muta_config":
        build.muta_config()
    # 发布 muta 到虚拟机
    if sys.argv[1] == "deploy_binary":
        deploy.deploy_binary()
    # 启动
    if sys.argv[1] == "deploy_run":
        deploy.deploy_run()
    # 一个 shell 接口, 里面的命令会在所有虚拟机中执行
    if sys.argv[1] == "oam_sh":
        oam.oam_sh()
    # 执行性能测试, 测试结果发送至 tg
    if sys.argv[1] == "oam_bench":
        oam.oam_bench()


if __name__ == "__main__":
    main()
