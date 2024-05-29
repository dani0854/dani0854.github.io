---
title: 'Minimal OpenBSD install on Vultr'
date: '2024-03-15'
tags: ['openbsd', 'minimal', 'tutorial']
featuredImage: 'cover.webp'
---

{{< notice info >}}
Originally I have written this as a part of another article (which is still work in progress), but it quickly became to extensive, and I decided to move it to its own article.
{{< /notice >}}

<!--toc:start-->
- [Motivation](#motivation)
  - [Why Vultr?](#why-vultr)
- [Vultr OpenBSD install](#vultr-openbsd-install)
  - [Creating Vultr VPS instance](#creating-vultr-vps-instance)
  - [Exploring Vultr OpenBSD install](#exploring-vultr-openbsd-install)
- [Minimal OpenBSD install](#minimal-openbsd-install)
  - [Install script](#install-script)
  - [Exploring reinstalled OpenBSD](#exploring-reinstalled-openbsd)
  - [Setting up IPv6](#setting-up-ipv6)
  - [Installing security patches](#installing-security-patches)
  - [Exorcising daemons](#exorcising-daemons)
  - [Can we do better?](#can-we-do-better)
<!--toc:end-->

# Motivation
Although I am more familiar with Linux based systems, I wanted to play with OpenBSD.
I am a big believer in that the simpler and more minimal the software is, the more secure it is due to a smaller attack surface.
Linux unfortunately is quite big these days, and although it is possible to compile a minimal secure kernel, it is not a trivial task.
Especially with the fact that there are more than 12 thousand configuration options for compilation nowadays.

{{< notice note >}}
I specifically omitted GNU prefix. This due to the fact I was talking about the kernel itself.
And if I needed to choose a Linux based OS, I would have probable gone with Alpine, which is musl libc and busybox based.
This is due to the fact that GNU and minimal are quite opposite sides of spectrum.
{{< /notice >}}

## Why Vultr?
I originally chose Vultr due to the fact that it already had OpenBSD out of the box, which is not the end goal of this article, but will make a great point of comparison.
Also, I liked its bandwidth plan and bandwidth alliance with Cloudflare.
{{< notice note >}}
While this tutorial has been written with Vultr specifics, it can still be useful for setting up minimal OpenBSD on any VPS provider.
{{< /notice >}}

# Vultr OpenBSD install
## Creating Vultr VPS instance
I picked up cheapest shared CPU plan with 1 vCPU and 1GB of RAM. OpenBSD 7.4 as an OS.\
From additional options I only chose IPv6, since it's free and may prove useful.\
I didn't enable backups, since our setup should be stateless, with no log policy.
So only our configuration has to be backed up, and since all changes to it are manual, than it can also be backed up manually.

After the instance is created, you can SSH into it.

## Exploring Vultr OpenBSD install
If you ever installed OpenBSD, you would know that during installation you have the option chose file sets which are installed.
I didn't find an easy way how to list installed file sets, other than checking installed binaries one by one.
There is this [gist](https://gist.github.com/chriswayg/630f8cce5f1ac73e9a3fdd82c01a7886) that does it for you.
Unfortunately it is outdated, and meant for OpenBSD 6.5.

So I wrote a new one:
```sh {filename=openbsd-info.sh}
#!/usr/bin/env sh
set -e

[ "$(uname -r)" = "7.4" ] || echo "WARNING: This script was made for OpenBSD 7.4, it might work incorrectly on other versions"

echo "Currently running kernel: $(uname -srv)"

echo "Installed OpenBSD file sets:"

# A good explanation can be found here https://unix.stackexchange.com/questions/652178/how-to-add-cpus-to-openbsd-in-virtualbox-post-install
echo "[$([ -f /bsd.sp ] || uname -v | grep -qv '.MP#' && echo 'X' || echo ' ')] bsd"
echo "[$([ -f /bsd.mp ] || uname -v | grep -q '.MP#' && echo 'X' || echo ' ')] bsd.mp"

echo "[$([ -f /bsd.rd ] && echo 'X' || echo ' ')] bsd.rd"

echo "[$([ -f /sbin/dmesg ] && echo 'X' || echo ' ')] baseXX.tgz"
echo "[$([ -f /usr/bin/cpp ] && echo 'X' || echo ' ')] compXX.tgz"
echo "[$([ -f /usr/share/man/man5/fstab.5 ] && echo 'X' || echo ' ')] manXX.tgz"
echo "[$([ -f /usr/games/worm ] && echo 'X' || echo ' ')] gameXX.tgz"

echo "[$([ -f /usr/X11R6/bin/xhost ] && echo 'X' || echo ' ')] xbaseXX.tgz"
echo "[$([ -f /usr/X11R6/lib/X11/fonts/100dpi/courR12.pcf.gz ] && echo 'X' || echo ' ')] xfontXX.tgz"
echo "[$([ -f /usr/X11R6/bin/Xorg ] && echo 'X' || echo ' ')] xservXX.tgz"
echo "[$([ -f /usr/X11R6/bin/x11perfcomp ] && echo 'X' || echo ' ')] xshareXX.tgz"
```

Once you created that script, you can run it:
```sh
sh openbsd-info.sh
~~~output
Currently running kernel: OpenBSD 7.4 GENERIC.MP#2
Installed OpenBSD file sets:
[X] bsd
[X] bsd.mp
[X] bsd.rd
[X] baseXX.tgz
[X] compXX.tgz
[X] manXX.tgz
[X] gameXX.tgz
[X] xbaseXX.tgz
[X] xfontXX.tgz
[X] xservXX.tgz
[X] xshareXX.tgz
```

Here we can see, that the default installation of OpenBSD is nowhere minimal.
I don't quite understand why they would install all the X11 stuff for a VPS.
Another thing, that this VPS is currently running a multi-processor kernel, which is not necessary for the 1vCPU cheapest plan I chose.  

Although this default installation of OpenBSD would probably do for most tasks.
And it is also possible to remove extra software.
But since I plan to use the minimal amount of software possible, I decided to install it from 0.

# Minimal OpenBSD install
Although we can download installation ISO, then upload it to Vultr and so on.
We already have OpenBSD installer, in the form of a ramdisk kernel `/bsd.rd`.

Just to make sure we are running the latest installer, let's download a fresh `bsd.rd`, with `SHA256.sig` and OpenBSD public key to verify `bsd.rd`.
```sh {manual="[ftp(1)](https://man.openbsd.org/ftp)"}
cd /tmp
ftp https://$MIRROR/pub/OpenBSD/$VERSION/$ARCH/bsd.rd
ftp https://ftp.openbsd.org/pub/OpenBSD/$VERSION/$ARCH/SHA256.sig
ftp https://ftp.openbsd.org/pub/OpenBSD/$VERSION/openbsd-$(echo $VERSION | tr -d ".")-base.pub
~~~input
* `VERSION` `7.4` "x.y": Set the latest verision.
* `ARCH` `amd64`: Set your architecture.
* `MIRROR` `cdn.openbsd.org`: Set closest mirror, or use default CDN.
```

{{< notice tip >}}
[ftp(1)](https://man.openbsd.org/ftp) which is preinstalled (part of `baseXX.tgz`) can be used as `wget`/`curl` alternative to fetch files.
{{< /notice >}}

Verify the downloaded `bsd.rd`.
```sh {manual="[signify(1)](https://man.openbsd.org/signify.1)"}
signify -Cp openbsd-$(echo $VER | tr -d ".")-base.pub -x SHA256.sig bsd.rd
~~~output
Signature Verified
bsd.rd: OK
```

If everything is ok, let's install it to the root directory.
 
```sh {manual="[install(1)](https://man.openbsd.org/install)"}
install -b -m 600 bsd.rd /bsd.rd
~~~desc
* `-b`: Backup destination
* `-m 600`: Target file permissions.
```

Now for the tricky part, booting into it. This can be quite challenging, since you have run `bsd.rd` in the boot console, as soon as it appears.
I found the easiest way to do it is to launch VNC console, login and then run `reboot`. When you see boot, enter `boot> bsd.rd`. This will boot ramdisk installer.

{{< notice tip >}}
Vultr uses noVNC. In order to paste something there, you have to use noVNC clipboard feature.
It takes a while to enter all the text, so wait until all the text in pasted, before hitting enter in console, since it will send enter straight away.
The easiest way I found to do it, is when you are entering some text and need to press enter straight after that, is to add an extra newline in noVNC clipboard window.
{{< /notice >}}

## Install script
1. Press `(I)nstall`.
2. Chose default keyboard layout.
3. Enter hostname, preferably the one chosen while creating Vultr VPS.
4. Configure network interface.
   * Use static configuration for IPv4. Address, netmask and gateway can be found in Vultr server settings.
   * Don't configure IPv6 for now.
5. Set up DNS name, I used reverse DNS entry from IPv4 settings in Vultr, which is of the form `<IPv4>.vultrusercontent.com`.
6. For nameserver, I used Cloudflare DNS `1.1.1.1 2606:4700:4700::1111`.
7. Create a new root password.
8. Enable sshd.
9. Say no to X Window System.
10. I decided not to set up a user, and use root for access.
11. I set ssh login to `prohibit-password`, since I plan to access VPS via root.
12. Set timezone to `UTC`
13. Leave `sd0` as root disk, and there is no need for disk encryption.
14. I chose `(W)hole disk MBR`, and created following partitions ([disklabel(8)](https://man.openbsd.org/disklabel.8)):
    * `/` 1GB
    * `swap` 256MB
    * `/usr` 5GB
    * `/tmp` 1GB
    * `/var` 2GB
    * I left the rest unpartitioned, for future use.
15. Chose `http`, ignore proxy, set server to mirror or main CDN.
16. Here is the important part, we will need to choose a minimal set of file sets. I only chose `bsd` and `baseXX.tgz`, both of which are required for any install of OpenBSD.
    * `bsd` - OpenBSD single processor kernel, which is required by any install.
{{< notice question >}}
Although I haven't tried it, I wonder if it is possible to only install multiple processor kernel using standard installation script.
This exercise is left for the reader, and I would appreciate any additional information in the comments.
{{< /notice >}}
    * `bsd.mp` - OpenBSD multiple processor kernel. Since I only have one vCPU core, I don't need this one. If you have multiple vCPU, then you have to install it to make use of all vCPU.
    * `bsd.rd` - Ramdisk kernel (which we are running now). We can always download it later if we need it.
    * `baseXX.tgz` - Main system applications and more, this is definitely required, as it contains things such as [rc(8)](https://man.openbsd.org/rc), without them system won't be functional.
    * `compXX.tgz` - Compiler tool chain, since we are creating a runtime environment, we won't need them.
    * `manXX.tgz` - Collection of manual pages. If you want to read documentation using [man(1)](https://man.openbsd.org/man), you can install it.
      But I prefer to use the web version at [man.openbsd.org](https://man.openbsd.org).
    * `gameXX.tgz` - Games are defiantly beyond minimal installation.
    * `x{base,font,serv,share}XX.tgz` - Are X11 libraries and applications, which is not needed for non-graphical installation.
17. Reboot!
18. Login, and copy your public ssh key to `/root/.ssh/authorized_keys` for convenience.
{{< notice note >}}
If you have previously connected to VPS using ssh.
You will have to remove this server from `~/.ssh/known_hosts`.
{{< /notice >}}

## Exploring reinstalled OpenBSD
So now if we use the same script from [above](#exploring-openbsd).

```sh
sh openbsd-info.sh
~~~output
Currently running kernel: OpenBSD 7.4 GENERIC#1336
Installed OpenBSD file sets:
[X] bsd
[ ] bsd.mp
[ ] bsd.rd
[X] baseXX.tgz
[ ] compXX.tgz
[ ] manXX.tgz
[ ] gameXX.tgz
[ ] xbaseXX.tgz
[ ] xfontXX.tgz
[ ] xservXX.tgz
[ ] xshareXX.tgz
```

We will see that we have got a much more minimal installation. Using single processor kernel, and only `baseXX.tgz` packages.

{{< notice info >}}
The number after `#` in `GENERIC#1336` is the kernel build number, and doesn't mean much. More information available [here](https://flak.tedunangst.com/post/OpenBSD-version-numbers).
{{< /notice >}}

## Setting up IPv6
{{< notice note >}}
If you are using a different server provider, you interface name may be different. The following assumes your interface named `vio0`.
{{< /notice >}}

To set up IPv6 we will need to add following line to `/etc/hostname.vio0`.
```sh {manual="[ifconfig(8)](https://man.openbsd.org/ifconfig.8)"}
echo "inet6 autoconf -soii -temporary" >> /etc/hostname.vio0
~~~desc
* `-soii`: Disable IPv6 persistent Semantically Opaque Interface Identifiers on the interface. Currently configured addresses will not be removed until they become invalid.
* `-temporary`: Disable IPv6 autoconf temporary address extensions on the interface. Currently configured addresses will not be removed until they become invalid.
```

To reload our interface, execute the following.
```sh {manual="[netstart(8)](https://man.openbsd.org/netstart.8)"}
sh /etc/netstart vio0
```

## Installing security patches
Since we are using prebuilt release binaries, we will need to apply binary patches.
You can find all available binary patches in your release [errata](https://www.openbsd.org/errata.html).
If you compiled from `-stable` or `-current` branch, this step can be skipped.

The easiest way to fetch and apply all necessary patches, is to use [syspatch(8)](https://man.openbsd.org/syspatch).

We can list all available patches using:
```sh {manual="[syspatch(8)](https://man.openbsd.org/syspatch)"}
syspatch -c
~~~output
002_msplit
003_patch
004_ospfd
005_tmux
006_httpd
007_perl
008_vmm
009_pf
011_ssh
013_unbound
014_vmm
```

To install all patches, run:
```sh {manual="[syspatch(8)](https://man.openbsd.org/syspatch)"}
syspatch
```

Now you can list installed patches:
```sh {manual="[syspatch(8)](https://man.openbsd.org/syspatch)"}
syspatch -l
~~~output
002_msplit
003_patch
004_ospfd
005_tmux
006_httpd
007_perl
008_vmm
009_pf
011_ssh
013_unbound
014_vmm
```

{{< notice warning >}}
Don't forget to reboot, to reload a new kernel.
{{< /notice >}}

Since I value security over uptime, I will also add `syspatch` to [crontab(5)](https://man.openbsd.org/crontab.5).
```sh
echo "@daily /usr/sbin/syspatch && /sbin/reboot" >> /etc/crontab
```

{{< notice note >}}
[syspatch(8)](https://man.openbsd.org/syspatch) will return exit code 2 if no new patches installed, so reboot will only happen when new patches are installed.
{{< /notice >}}

## Exorcising daemons
OpenBSD uses [rc(8)](https://man.openbsd.org/rc) to start system daemons.
We can list enabled daemons using following command.

```sh {manual="[rcctl(8)](https://man.openbsd.org/rcctl)"}
rcctl ls on
~~~output
check_quotas
cron
dhcpleased
library_aslr
ntpd
pf
pflogd
resolvd
slaacd
smtpd
sndiod
sshd
syslogd
```

You can see that there aren't that many daemons enabled by default, but we can still disable some of them.
```sh {manual="[rcctl(8)](https://man.openbsd.org/rcctl)"}
rcctl disable dhcpleased smtpd sndiod
~~~desc
* `dhcpleased`: We are using static configuration for IPv4, and [slaacd(8)](https://man.openbsd.org/slaacd) for IPv6.
* `smtpd`: We don't need smtp daemon. 
* `sndiod`: We don't need audio support.
```

## Can we do better?
Currently, we are still using generic OpenBSD kernel, which contains things we don't really need.
Also, `baseXX.tgz` contains a lot of utilities and libraries which aren't really required.
For example [clang(1)](https://man.openbsd.org/clang), which is installed with `baseXX.tgz`, rather than with `compXX.tgz`.

In order to achieve a completely minimal install we can compile OpenBSD manually from `-stable`.
But it will be a much more complicated task.
Also in order to apply fixes and patches we will need to recompile our system every time from `-stable`.
I believe that a minimal installation described above would be a more practical and secure solution.

However, I plan to write an article about performing a minimal compilation in the future, in order to learn more about OpenBSD.
And my opinions on this matter might be updated in the future.
